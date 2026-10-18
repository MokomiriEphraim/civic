import React, { useEffect, useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Info,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  CopyCheck,
  Sparkles,
  Truck,
  Users,
  Maximize2
} from 'lucide-react';
import {
  AiAssessment,
  DuplicateMatch,
  HazardSeverity,
  HazardReport,
  HAZARD_SEVERITIES,
  StepNumber,
} from '../types';
import { HAZARD_PRESETS } from '../data/mockReports';
import { confirmIssue, createReport, detectDuplicates } from '../api/reports';
import { POTHOLE_IMAGE } from '../data/images';
import { dispatchTeam } from '../utils/dispatch';
import { priorityScore } from '../utils/priority';
import {
  analyseHazardImage,
  HAZARD_OPTIONS,
  type HazardVisionResult,
} from '../utils/hazardVision';
import { WavyFooter } from './WavyFooter';
import { MapModal } from './MapModal';
import { BandBadge } from './ui';

const potholeImg = POTHOLE_IMAGE;
const DEPARTMENT_OPTIONS = Array.from(
  new Set(HAZARD_OPTIONS.map((option) => option.department).filter(Boolean))
);

interface ReportWizardProps {
  onCancel: () => void;
  onFinish: (report: HazardReport) => void;
  onViewReports: () => void;
  onOpenTicket?: (id: string) => void;
  residentName?: string;
  initialStep?: StepNumber;
  onStepChange?: (step: StepNumber) => void;
}

export const ReportWizard: React.FC<ReportWizardProps> = ({
  onCancel,
  onFinish,
  onViewReports,
  onOpenTicket,
  residentName = 'Demo Citizen',
  initialStep = 1,
  onStepChange,
}) => {
  const [currentStep, setCurrentStep] = useState<StepNumber>(initialStep);

  useEffect(() => {
    if (initialStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  const [selectedPhoto, setSelectedPhoto] = useState<string>(potholeImg);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<boolean>(false);

  const [visionResult, setVisionResult] = useState<HazardVisionResult | null>(null);
  const [visionStatus, setVisionStatus] = useState<
    'loading-model' | 'analysing-image' | 'complete' | 'error'
  >('loading-model');
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [selectedHazardId, setSelectedHazardId] = useState('pothole');
  const [hazardCategory, setHazardCategory] = useState('Road Hazard');
  const [hazardSpecific, setHazardSpecific] = useState('Pothole');
  const [severity, setSeverity] = useState<HazardSeverity | ''>('');
  const [hazardDescription, setHazardDescription] = useState(
    'Large pothole, potential risk to vehicles and pedestrians.'
  );
  const [department, setDepartment] = useState('Roads & Stormwater');
  const [departmentUnit, setDepartmentUnit] = useState('(Maintenance & Repairs)');
  const [coordinates, setCoordinates] = useState('-33.9249, 18.4241');
  const [address, setAddress] = useState('Kloof Nek Rd & Camp St, Cape Town');

  // Step 3 details
  const [userNotes, setUserNotes] = useState('');
  const [noticedDate, setNoticedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
  });
  const [contact, setContact] = useState('');

  // Submitted ticket info
  const [generatedTicketId, setGeneratedTicketId] = useState<string | null>(null);
  const [assignedCrew, setAssignedCrew] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const userSelectedReportType = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate detection (runs when the details step opens).
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateRadius, setDuplicateRadius] = useState(250);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const [confirmedTicketId, setConfirmedTicketId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVisionResult(null);
    setVisionError(null);
    setVisionStatus('loading-model');
    setModelProgress(null);

    void analyseHazardImage(selectedPhoto, (status, progress) => {
      if (cancelled) return;
      if (status === 'model-progress') {
        setVisionStatus('loading-model');
        if (progress !== undefined) setModelProgress(Math.round(progress));
      } else {
        setVisionStatus(status);
      }
    })
      .then((result) => {
        if (cancelled) return;
        setVisionResult(result);
        setVisionStatus('complete');

        if (userSelectedReportType.current) return;

        const suggestion = result.suggestion;
        if (suggestion) setClassificationError(null);
        setSelectedHazardId(suggestion?.id ?? 'not-a-hazard');
        setHazardCategory(suggestion?.hazardType ?? '');
        setHazardSpecific(suggestion?.subType ?? '');
        setDepartment(suggestion?.department ?? '');
        setDepartmentUnit(suggestion?.departmentUnit ?? '');
        if (suggestion) setHazardDescription(suggestion.description);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setVisionStatus('error');
        setVisionError(
          error instanceof Error
            ? error.message
            : 'Local image analysis failed. Select the report details manually.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPhoto]);

  useEffect(() => {
    if (currentStep !== 3) return;
    let cancelled = false;
    setDuplicatesLoading(true);
    setDuplicateError(null);
    detectDuplicates({
      subType: hazardSpecific,
      hazardType: hazardCategory,
      location: coordinates,
    })
      .then((result) => {
        if (cancelled) return;
        setDuplicateMatches(result.matches);
        setDuplicateRadius(result.radiusMetres);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDuplicateError(
          error instanceof Error ? error.message : 'Could not check for similar reports.'
        );
      })
      .finally(() => {
        if (!cancelled) setDuplicatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentStep, hazardSpecific, hazardCategory, coordinates]);

  const handleConfirmDuplicate = async (id: string) => {
    setConfirmingId(id);
    setDuplicateError(null);
    try {
      await confirmIssue(id, residentName);
      setConfirmedTicketId(id);
    } catch (error) {
      setDuplicateError(
        error instanceof Error ? error.message : 'Your confirmation could not be saved.'
      );
    } finally {
      setConfirmingId(null);
    }
  };

  const draftPriority = severity
    ? priorityScore({
        severity,
        status: 'Received',
        department,
        affected: 0,
        date: noticedDate,
      })
    : null;
  const crewPreview = dispatchTeam(department, coordinates);

  const compressPhotoFile = async (file: File): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    let width = Math.min(bitmap.width, 1600);
    let height = Math.round((bitmap.height / bitmap.width) * width);

    try {
      for (let attempt = 0; attempt < 7; attempt += 1) {
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image compression is unavailable in this browser.');
        context.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', Math.max(0.5, 0.82 - attempt * 0.05))
        );
        if (!blob) throw new Error('The selected image could not be compressed.');
        if (blob.size <= 2_500_000) {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('The selected image could not be read.'));
            reader.onload = () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('The selected image could not be read.'));
            };
            reader.readAsDataURL(blob);
          });
        }
        width = Math.round(width * 0.8);
        height = Math.round(height * 0.8);
      }
    } finally {
      bitmap.close();
      canvas.width = 0;
      canvas.height = 0;
    }

    throw new Error('The image is too large to upload. Choose a smaller photo.');
  };

  const processPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      setPhotoError('Choose an image smaller than 10 MB.');
      return;
    }

    try {
      setPhotoError(null);
      const compressedPhoto = await compressPhotoFile(file);
      userSelectedReportType.current = false;
      setSelectedHazardId('not-a-hazard');
      setHazardCategory('');
      setHazardSpecific('');
      setDepartment('');
      setDepartmentUnit('');
      setSeverity('');
      setSelectedPhoto(compressedPhoto);
      setHazardDescription('Describe what happened after reviewing the photo suggestion.');
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'The selected image could not be processed.'
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processPhotoFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleSelectPreset = (presetIndex: number) => {
    const preset = HAZARD_PRESETS[presetIndex];
    userSelectedReportType.current = true;
    setPhotoError(null);
    setSelectedPhoto(preset.photoUrl);
    setHazardCategory(preset.hazardType);
    setHazardSpecific(preset.subType);
    setSeverity('');
    setHazardDescription(preset.description);
    setDepartment(preset.department);
    setDepartmentUnit(preset.departmentUnit);
    setCoordinates(preset.location);
    setAddress(preset.address);
  };

  const handleSelectHazard = (optionId: string) => {
    const option = HAZARD_OPTIONS.find((item) => item.id === optionId);
    if (!option) return;
    userSelectedReportType.current = true;
    setClassificationError(null);
    setSelectedHazardId(option.id);
    setHazardCategory(option.hazardType);
    setHazardSpecific(option.subType);
    setDepartment(option.department);
    setDepartmentUnit(option.departmentUnit);
    if (option.description) setHazardDescription(option.description);
  };

  const handleGoToReview = () => {
    setCurrentStep(2);
  };

  const handleContinueToDetails = () => {
    if (!hazardCategory.trim() || !hazardSpecific.trim() || !department.trim() || !severity) {
      setClassificationError('Choose a report type, department, and severity before continuing.');
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionLock.current) return;
    if (photoError) {
      setSubmissionError('Fix the photo selection error before submitting.');
      return;
    }
    if (
      !selectedPhoto ||
      !hazardCategory.trim() ||
      !hazardSpecific.trim() ||
      !department.trim() ||
      !severity
    ) {
      setSubmissionError('Add a hazard photo and confirm the hazard details before submitting.');
      return;
    }
    submissionLock.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);
    const timestamp = new Date();
    const formattedTimestamp = timestamp.toLocaleString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const noticedAtDate = new Date(`${noticedDate}T12:00:00`);
    const formattedDate = (
      Number.isNaN(noticedAtDate.getTime()) ? timestamp : noticedAtDate
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let aiAssessment: HazardReport['aiAssessment'];
    if (visionResult) {
      const outcome: NonNullable<AiAssessment>['outcome'] = !visionResult.suggestion
        ? 'unclassified'
        : hazardCategory === visionResult.suggestion.hazardType &&
            hazardSpecific === visionResult.suggestion.subType &&
            department === visionResult.suggestion.department
          ? 'accepted'
          : 'edited';
      aiAssessment = {
        model: visionResult.model,
        label: visionResult.label,
        score: visionResult.score,
        inferenceMs: visionResult.inferenceMs,
        outcome,
      };
    }

    const report: Omit<HazardReport, 'id'> = {
      hazardType: `${hazardCategory} (${hazardSpecific})`,
      subType: hazardSpecific,
      department: department,
      departmentUnit: departmentUnit,
      location: coordinates,
      address: address,
      status: 'Assigned',
      date: formattedDate,
      severity: severity,
      description: userNotes.trim() ? userNotes : hazardDescription,
      photoUrl: selectedPhoto,
      contact: contact.trim() || undefined,
      detectedAt: formattedTimestamp,
      aiAssessment,
      timeline: [
        { stage: 'Report submitted', timestamp: formattedTimestamp, done: true },
        {
          stage: 'Report details reviewed',
          timestamp: formattedTimestamp,
          done: true,
          note: aiAssessment
            ? `Resident ${aiAssessment.outcome} the ${aiAssessment.label} suggestion.`
            : 'Resident confirmed the report details; AI assistance was unavailable or not used.',
        },
      ],
    };

    try {
      const savedReport = await createReport(report);
      setGeneratedTicketId(savedReport.id);
      setAssignedCrew(savedReport.assignedTeam ?? null);
      setReportSaved(true);
      onFinish(savedReport);
      setCurrentStep(4);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'The report could not be submitted.'
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedPhoto(potholeImg);
    setPhotoError(null);
    setUserNotes('');
    setContact('');
    setGeneratedTicketId(null);
    setAssignedCrew(null);
    setReportSaved(false);
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#F6F8F5] flex flex-col justify-between">
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-5 pb-8 flex-1">
        {/* Top Back Navigation (Visible in steps 1, 2, 3) */}
        {currentStep < 4 && (
          <div className="mb-4">
            <button
              onClick={() => {
                if (currentStep === 1) onCancel();
                else setCurrentStep((prev) => (prev - 1) as StepNumber);
              }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Stepper Progress Bar (Steps 1 to 4) */}
        {currentStep < 4 && (
          <div className="flex items-center justify-between max-w-md mx-auto mb-8 sm:mb-10 px-2 select-none">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  currentStep > 1
                    ? 'bg-[#234E35] text-white'
                    : currentStep === 1
                    ? 'bg-[#234E35] text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep >= 1 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Photo
              </span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-3 transition ${
                currentStep >= 2 ? 'bg-[#234E35]' : 'bg-slate-200'
              }`}
            />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  currentStep > 2
                    ? 'bg-[#234E35] text-white'
                    : currentStep === 2
                    ? 'bg-[#234E35] text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep >= 2 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Review
              </span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-3 transition ${
                currentStep >= 3 ? 'bg-[#234E35]' : 'bg-slate-200'
              }`}
            />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  currentStep > 3
                    ? 'bg-[#234E35] text-white'
                    : currentStep === 3
                    ? 'bg-[#234E35] text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep >= 3 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Details
              </span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-3 transition ${
                currentStep === 4 ? 'bg-[#234E35]' : 'bg-slate-200'
              }`}
            />

            {/* Step 4 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 4
                    ? 'bg-[#234E35] text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                4
              </div>
              <span
                className={`text-xs font-semibold ${
                  currentStep === 4 ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                Submit
              </span>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 1: PHOTO UPLOAD */}
        {/* ---------------------------------------------------- */}
        {currentStep === 1 && (
          <div className="animate-in fade-in duration-200">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#163D25] mb-1.5"
              style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              Report a Municipal Hazard
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Take a clear photo of the issue or upload from your device.
            </p>
            <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
              The open-source vision model runs in your browser. Its first download may take a while.
              Your photo is not sent to the model host; it is saved with your report only after you submit.
            </p>
            <div aria-live="polite" className="mb-4 text-xs text-slate-600">
              {visionStatus === 'loading-model' &&
                `Loading the local vision model${modelProgress === null ? '…' : `: ${modelProgress}%`}`}
              {visionStatus === 'analysing-image' && 'Analysing this photo in your browser…'}
              {visionStatus === 'complete' &&
                (visionResult?.suggestion
                  ? `Suggestion ready: ${visionResult.suggestion.subType}. Review it before continuing.`
                  : 'The model could not identify a supported hazard. Choose the report type manually.')}
              {visionStatus === 'error' && 'AI assistance is unavailable; you can still complete the report manually.'}
            </div>
            {visionError && (
              <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Local analysis unavailable: {visionError}
              </p>
            )}

            {/* Large Upload Box */}
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                processPhotoFile(event.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center bg-white/70 hover:bg-white hover:border-[#234E35]/60 transition cursor-pointer flex flex-col items-center justify-center shadow-xs group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Camera Circle Icon */}
              <div className="w-14 h-14 rounded-full bg-[#EBF5EE] text-[#234E35] flex items-center justify-center mb-4 group-hover:scale-105 transition shadow-xs">
                <Camera className="w-6 h-6 text-[#234E35]" />
              </div>

              <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-1">
                Tap to take a photo
              </h3>
              <p className="text-xs text-slate-500 mb-3">or drag and drop · JPEG, PNG, or WebP, up to 10 MB</p>

              <div className="flex items-center justify-center w-full max-w-xs my-2">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="px-3 text-[11px] text-slate-400 uppercase font-medium">
                  or
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <button
                type="button"
                aria-label="Choose a hazard photo"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Upload from device</span>
              </button>
            </div>

            {photoError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {photoError}
              </p>
            )}

            {/* Quick Demo Preset Picker */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Example photo presets:
              </span>
              {HAZARD_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(idx)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                    selectedPhoto === p.photoUrl
                      ? 'bg-[#234E35] text-white border-[#234E35]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {p.subType}
                </button>
              ))}
            </div>

            {/* Photo Preview Indicator if selected */}
            {selectedPhoto && (
              <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedPhoto}
                    alt="Selected hazard"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Photo selected
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {visionResult?.suggestion
                        ? `AI suggestion: ${visionResult.suggestion.subType}`
                        : visionStatus === 'error' || visionStatus === 'complete'
                          ? 'Choose a report type manually'
                          : 'AI suggestion pending'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#2E7D43] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                  Preview ready
                </span>
              </div>
            )}

            {/* Tip Box */}
            <div className="mt-5 p-3.5 rounded-xl bg-white/90 border border-slate-200/90 flex items-start gap-2.5 text-slate-600">
              <Info className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">
                <strong className="text-slate-800">Tip:</strong> Include nearby landmarks in your description. This demo does not determine your location or dispatch a municipal crew.
              </p>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleGoToReview}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#234E35] hover:bg-[#1A3D29] text-white text-xs sm:text-sm font-semibold transition shadow-xs"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 2: DEMO CLASSIFICATION REVIEW */}
        {/* ---------------------------------------------------- */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-200">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#163D25] mb-6"
              style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              Review the suggested details
            </h2>
            <section aria-live="polite" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-semibold text-slate-900">Local AI image suggestion</p>
                  {visionStatus === 'loading-model' && (
                    <p className="mt-1 text-xs">
                      {modelProgress === null
                        ? 'Downloading or loading the model. This may take a few minutes the first time.'
                        : `Downloading model files: ${modelProgress}%.`}
                    </p>
                  )}
                  {visionStatus === 'analysing-image' && (
                    <p className="mt-1 text-xs">Analysing the photo on this device…</p>
                  )}
                  {visionStatus === 'complete' && visionResult && (
                    <p className="mt-1 text-xs">
                      {visionResult.suggestion
                        ? `Suggested: ${visionResult.suggestion.subType}`
                        : 'No supported hazard suggestion was strong enough.'}{' '}
                      Model score: {Math.round(visionResult.score * 100)}% (relative ranking, not a calibrated probability or accuracy measure).
                    </p>
                  )}
                  {visionStatus === 'error' && (
                    <p className="mt-1 text-xs">Analysis failed. Enter the report details manually.</p>
                  )}
                  <p className="mt-2 text-xs">
                    The model does not judge severity, urgency, or whether a report is genuine. Confirm or change every field; municipal staff must verify reports.
                  </p>
                </div>
              </div>
            </section>

            {/* Main Split Review Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 gap-0 mb-8">
              {/* Left Column: Photo Preview */}
              <div className="md:col-span-5 relative bg-slate-900 min-h-[240px] md:min-h-[340px] flex items-center justify-center overflow-hidden">
                <img
                  src={selectedPhoto}
                  alt="Detected hazard preview"
                  className="w-full h-full object-cover"
                />

                {/* "[ ] Detected" green tag badge (as seen on the mockup) */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#234E35]/95 backdrop-blur-xs text-white text-[11px] font-bold tracking-wide border border-emerald-400/40 shadow-sm">
                  <div className="w-2.5 h-2.5 border border-emerald-300 rounded-xs flex items-center justify-center">
                    <div className="w-1 h-1 bg-emerald-300 rounded-full" />
                  </div>
                  <span>Photo preview</span>
                </div>

                {/* Expand / zoom preview button */}
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="absolute bottom-3 right-3 p-1.5 rounded-md bg-black/60 text-white hover:bg-black/80 transition text-[10px] flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>

              {/* Right Column: AI Details & Routing */}
              <div className="md:col-span-7 p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  {/* Hazard Title Block */}
                  <div className="flex items-start gap-3.5 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-[#E65A2C] border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-[#E65A2C]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                        {hazardCategory}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-slate-500">
                        {hazardSpecific}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Report type — confirm or change
                      <select
                        value={selectedHazardId}
                        onChange={(event) => handleSelectHazard(event.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 focus:border-[#234E35] focus:outline-none focus:ring-1 focus:ring-[#234E35]"
                      >
                        {HAZARD_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Severity — your assessment
                      <select
                        value={severity}
                        onChange={(event) => {
                          const selected = HAZARD_SEVERITIES.find(
                            (value) => value === event.target.value
                          );
                          if (selected) setSeverity(selected);
                        }}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 focus:border-[#234E35] focus:outline-none focus:ring-1 focus:ring-[#234E35]"
                      >
                        <option value="" disabled>Choose severity</option>
                        {HAZARD_SEVERITIES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {classificationError && (
                    <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      {classificationError}
                    </p>
                  )}
                  <label className="mb-5 block text-xs font-semibold text-slate-700">
                    Suggested department — confirm or change
                    <select
                      value={department}
                      onChange={(event) => {
                        setDepartment(event.target.value);
                        const option = HAZARD_OPTIONS.find(
                          (item) => item.id === selectedHazardId
                        );
                        if (option && option.department !== event.target.value) {
                          setDepartmentUnit('(Needs review)');
                        } else if (option) {
                          setDepartmentUnit(option.departmentUnit);
                        }
                      }}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-800 focus:border-[#234E35] focus:outline-none focus:ring-1 focus:ring-[#234E35]"
                    >
                      {DEPARTMENT_OPTIONS.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>

                  {/* Severity Bar */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate-700">
                        Severity
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E65A2C] text-white">
                        {severity || 'Choose severity'}
                      </span>
                    </div>
                    {/* Meter bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-[#E65A2C] rounded-full transition-all duration-700"
                        style={{
                          width: `${severity ? ({ Low: 25, Medium: 50, High: 75, Critical: 100 }[severity]) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Description text */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">
                    {hazardDescription}
                  </p>

                  {/* Location Coordinate */}
                  <div className="mb-5 flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                      <div>
                        <span className="font-semibold block text-slate-800">Location</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {coordinates}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMap(true)}
                      className="text-xs font-semibold text-[#234E35] hover:underline"
                    >
                      View on map
                    </button>
                  </div>

                  {/* Assigned Department box */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-[#EBF5EE] border border-emerald-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white text-[#234E35] flex items-center justify-center shadow-2xs border border-emerald-100">
                        <Building2 className="w-4 h-4 text-[#234E35]" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                          Department
                        </span>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          {department}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {departmentUnit}
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#234E35] text-white flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Classification limitation */}
                <div className="mt-4 pt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Open-source local model • You confirm every suggestion</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleContinueToDetails}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#234E35] hover:bg-[#1A3D29] text-white text-xs sm:text-sm font-semibold transition shadow-xs"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 3: DETAILS (ADDITIONAL INFORMATION) */}
        {/* ---------------------------------------------------- */}
        {currentStep === 3 && (
          <div className="animate-in fade-in duration-200">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#163D25] mb-1.5"
              style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              Additional Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Help us process this faster by providing a few more details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {submissionError && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {submissionError}
                </p>
              )}

              {/* Similar open tickets nearby */}
              {duplicatesLoading && (
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                  Checking nearby open tickets…
                </p>
              )}
              {!duplicatesLoading && duplicateError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {duplicateError}
                </p>
              )}
              {!duplicatesLoading &&
                !dismissedDuplicates &&
                !confirmedTicketId &&
                duplicateMatches.length > 0 && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-start gap-2.5">
                      <CopyCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          This may already be reported
                        </h3>
                        <p className="text-xs text-slate-600">
                          {duplicateMatches.length} similar open{' '}
                          {duplicateMatches.length === 1 ? 'ticket' : 'tickets'} within{' '}
                          {duplicateRadius} m of this spot. Confirming helps crews prioritise it
                          without waiting for a duplicate ticket.
                        </p>
                      </div>
                    </div>

                    <ul className="mt-3 space-y-2">
                      {duplicateMatches.slice(0, 3).map((match) => (
                        <li
                          key={match.id}
                          className="rounded-xl border border-amber-200/80 bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500">
                              {match.id}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {match.subType}
                            </span>
                            <span className="text-[11px] text-slate-400">{match.status}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>{Math.round(match.distanceMeters)} m away</span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {match.affected} confirmed affected
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={confirmingId !== null}
                            onClick={() => void handleConfirmDuplicate(match.id)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#234E35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29] disabled:opacity-60"
                          >
                            {confirmingId === match.id
                              ? 'Saving…'
                              : "It's still a problem — confirm"}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => setDismissedDuplicates(true)}
                      className="mt-3 text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-800"
                    >
                      None of these — file a new report
                    </button>
                  </section>
                )}

              {confirmedTicketId && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">
                        Confirmation saved to {confirmedTicketId}
                      </h3>
                      <p className="text-xs text-slate-600">
                        The crew handling that ticket can see that {residentName} is still affected.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onOpenTicket && (
                      <button
                        type="button"
                        onClick={() => onOpenTicket(confirmedTicketId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#234E35] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1A3D29]"
                      >
                        Track this ticket
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDismissedDuplicates(true)}
                      className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-400"
                    >
                      File a separate report anyway
                    </button>
                  </div>
                </section>
              )}
              {/* Field 1: Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  maxLength={5000}
                  rows={4}
                  placeholder="E.g. Near the bus stop, been there for a while."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none focus:ring-1 focus:ring-[#234E35] shadow-2xs"
                />
              </div>

              {/* Field 2: Date noticed */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  When did you notice this?
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={noticedDate}
                    onChange={(e) => setNoticedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#234E35] focus:outline-none focus:ring-1 focus:ring-[#234E35] shadow-2xs"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Field 3: Contact */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Your contact <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={254}
                  placeholder="Email or phone number"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#234E35] focus:outline-none focus:ring-1 focus:ring-[#234E35] shadow-2xs"
                />
              </div>

              {/* Predicted priority and crew */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Predicted priority
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    {draftPriority ? (
                      <BandBadge band={draftPriority.band} score={draftPriority.score} />
                    ) : (
                      <span className="text-xs text-slate-500">
                        Choose a severity to preview the priority estimate.
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {draftPriority?.factors.slice(0, 3).map((factor) => (
                      <li
                        key={factor.label}
                        className="flex items-center justify-between text-[11px] text-slate-500"
                      >
                        <span>{factor.label}</span>
                        <span className="font-semibold text-slate-700">+{factor.points}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="sm:border-l sm:border-slate-100 sm:pl-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Likely first response
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-[#EBF5EE] text-[#234E35] flex items-center justify-center border border-emerald-200">
                      <Truck className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {crewPreview.team ? crewPreview.team.name : 'No crew pre-assigned'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">{crewPreview.reason}</p>
                </div>
              </section>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#234E35] hover:bg-[#1A3D29] text-white text-xs sm:text-sm font-semibold transition shadow-sm"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 4: CONFIRMATION / TICKET GENERATED */}
        {/* ---------------------------------------------------- */}
        {currentStep === 4 && (
          <div className="animate-in fade-in duration-300 max-w-xl mx-auto text-center pt-2">
            {/* Big Green Circle Checkmark Badge */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#EBF5EE] text-[#234E35] flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#2E7D43]" />
            </div>

            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#163D25] mb-2"
              style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              {reportSaved ? 'Report Saved' : 'Confirmation Preview'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-7">
              {reportSaved
                ? 'Your report was saved. This demo does not forward reports to a municipal department.'
                : 'This is a preview. Submit a report to save it and receive a server-generated ticket number.'}
            </p>

            {/* Ticket Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 text-left shadow-xs mb-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <span className="font-bold text-sm sm:text-base text-slate-900">
                  {generatedTicketId ? `Ticket ${generatedTicketId}` : 'Ticket number pending'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E65A2C] text-white">
                  {severity || 'Not selected'} Severity
                </span>
              </div>

              {/* Rows */}
              <div className="py-3.5 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Hazard Type</span>
                  <span className="font-bold text-slate-800">
                    {hazardCategory} ({hazardSpecific})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="font-bold text-slate-800">{department}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Location</span>
                  <div className="flex items-center gap-1 font-mono text-slate-800 font-medium text-xs">
                    <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                    <span>{coordinates}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Assigned crew</span>
                  <span className="font-bold text-slate-800 inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-800" />
                    {assignedCrew ?? crewPreview.team?.name ?? 'To be confirmed'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Priority</span>
                  {draftPriority ? (
                    <BandBadge band={draftPriority.band} score={draftPriority.score} />
                  ) : (
                    <span className="text-xs text-slate-500">Not available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {generatedTicketId && onOpenTicket && (
                <button
                  type="button"
                  onClick={() => onOpenTicket(generatedTicketId)}
                  className="w-full py-3 px-5 rounded-xl bg-[#234E35] hover:bg-[#1A3D29] text-white font-semibold text-xs sm:text-sm transition shadow-xs"
                >
                  Track {generatedTicketId}
                </button>
              )}

              <button
                type="button"
                onClick={onViewReports}
                className="w-full py-3 px-5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs sm:text-sm transition shadow-xs"
              >
                View dashboard
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-5 rounded-xl bg-transparent hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm transition"
              >
                Report Another Hazard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Wavy Landscape Footer */}
      <WavyFooter
        variant={currentStep === 4 ? 'submit' : 'minimal'}
        text={currentStep === 4 ? 'Together we keep our city safe' : undefined}
      />

      {/* Map Inspection Modal */}
      <MapModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        coordinates={coordinates}
        address={address}
        hazardTitle={`${hazardCategory} (${hazardSpecific})`}
      />
    </div>
  );
};
