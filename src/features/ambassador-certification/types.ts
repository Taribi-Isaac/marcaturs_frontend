export type CertificationProgrammeVersion = {
  id: number
  programme_id: number
  version_number: number
  status: string
  fee_amount_minor: number | null
  fee_currency: string | null
  published_at: string | null
}

export type CertificationProgramme = {
  id: number
  name: string
  description: string | null
  learning_objectives: string | null
  status: string
  current_published_version_id: number | null
  current_published_version?: CertificationProgrammeVersion | null
  created_at: string | null
}

export type CertificationEnrollment = {
  id: number
  status: string
  programme_id: number
  programme_version_id: number
  programme?: {
    id: number
    name: string
    status: string
  } | null
  programme_version?: {
    id: number
    version_number: number
    status: string
  } | null
  fee_amount_minor: number
  fee_currency: string
  enrolled_at: string | null
  created_at: string | null
}

export type AssessmentEligibility = {
  eligible: boolean
  required_lessons: number
  completed_required_lessons: number
  optional_lessons: number
  completed_optional_lessons: number
}

export type CurriculumLesson = {
  id: number
  module_id: number
  title: string
  description: string | null
  content_type: string
  is_required: boolean
  sort_order: number
  progress: {
    status: string
    started_at: string | null
    completed_at: string | null
  }
  resources: Array<{
    id: number
    title: string
    type: string
    original_filename?: string | null
    external_url?: string | null
  }>
}

export type CurriculumModule = {
  id: number
  title: string
  description: string | null
  sort_order: number
  lessons: CurriculumLesson[]
}

export type EnrollmentCurriculum = {
  enrollment: CertificationEnrollment
  programme_version: {
    id: number
    programme_id: number
    version_number: number
    status: string
  }
  modules: CurriculumModule[]
  assessment_eligibility: AssessmentEligibility
}

export type AssessmentQuestionOption = {
  id: number
  question_id: number
  label: string
  sort_order: number
}

export type AssessmentQuestion = {
  id: number
  assessment_id: number
  prompt: string
  type: string
  sort_order: number
  options?: AssessmentQuestionOption[]
}

export type LearnerAssessment = {
  enrollment: CertificationEnrollment
  programme_version: {
    id: number
    programme_id: number
    version_number: number
    status: string
  }
  available: boolean
  assessment_eligibility: AssessmentEligibility
  assessment: {
    id: number
    title: string
    instructions: string | null
    pass_mark_percent: string | null
    question_count?: number
    questions?: AssessmentQuestion[]
  }
}

export type AssessmentAttempt = {
  id: number
  enrollment_id: number
  assessment_id: number
  attempt_number: number
  status: 'in_progress' | 'submitted' | string
  started_at: string | null
  submitted_at: string | null
  pass_mark_percent: string
  correct_count?: number
  total_questions?: number
  score_percent?: string
  passed?: boolean
  assessment?: {
    id: number
    title: string
    instructions?: string | null
    pass_mark_percent?: string | null
    questions?: AssessmentQuestion[]
  }
}

export type CertificationAwardSummary = {
  id: number
  programme_id: number
  programme_version_id: number
  programme_name: string | null
  programme_version_number: number | null
  awarded_at: string | null
  certificate_id: number | null
}

export type ProfileCertification = {
  is_certified: boolean
  label: string | null
  awards: CertificationAwardSummary[]
}

export type CertificationCertificate = {
  id: number
  award_id: number
  certificate_number: string
  status: string
  issued_at: string | null
  recipient_name: string
  programme_name: string
  programme_version_number: number
  issuer_name: string
  artifact_status: string
  artifact_generated_at: string | null
  artifact_available: boolean
}

export type PurchaseInitializeResult = {
  authorization_url: string
  access_code: string
  payment: {
    id: number
    reference: string
    amount_minor: number
    currency: string
    status: string
  }
}

export type CertificationCtaState =
  | 'explore'
  | 'continue_learning'
  | 'assessment_ready'
  | 'certified'
