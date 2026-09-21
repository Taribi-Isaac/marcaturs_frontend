import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { settingsKeys } from '@/features/participant-settings/queryKeys'
import { fetchAssessment, fetchAttempts, startAttempt, submitAttempt } from './api'
import { certificationKeys } from './queryKeys'
import type { AssessmentAttempt, AssessmentQuestion } from './types'

export function AssessmentPage() {
  const { enrollmentId } = useParams()
  const id = Number(enrollmentId)
  const queryClient = useQueryClient()
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AssessmentAttempt | null>(null)

  const assessment = useQuery({
    queryKey: certificationKeys.assessment(id),
    queryFn: ({ signal }) => fetchAssessment(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const attempts = useQuery({
    queryKey: certificationKeys.attempts(id),
    queryFn: ({ signal }) => fetchAttempts(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const inProgress = useMemo(
    () => (attempts.data ?? []).find((row) => row.status === 'in_progress') ?? null,
    [attempts.data],
  )

  const questions: AssessmentQuestion[] =
    inProgress?.assessment?.questions ?? assessment.data?.assessment.questions ?? []

  const begin = useMutation({
    mutationFn: () => startAttempt(id),
    onSuccess: async () => {
      setError(null)
      setResult(null)
      setAnswers({})
      await queryClient.invalidateQueries({ queryKey: certificationKeys.attempts(id) })
      await queryClient.invalidateQueries({ queryKey: certificationKeys.assessment(id) })
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Could not start assessment.')
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const attemptId = inProgress?.id
      if (!attemptId) throw new Error('No in-progress attempt.')
      const payload = questions.map((question) => {
        const selected = answers[question.id]
        if (!selected) {
          throw new Error('Answer every question before submitting.')
        }
        return { question_id: question.id, selected_option_id: selected }
      })
      return submitAttempt(id, attemptId, payload)
    },
    onSuccess: async (attempt) => {
      setResult(attempt)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: certificationKeys.attempts(id) })
      await queryClient.invalidateQueries({ queryKey: certificationKeys.enrollments() })
      await queryClient.invalidateQueries({ queryKey: settingsKeys.ambassadorProfile() })
    },
    onError: (err) => {
      setError(err instanceof ApiClientError || err instanceof Error ? err.message : 'Submit failed.')
    },
  })

  if (!Number.isFinite(id) || id < 1) {
    return <ErrorState title="Enrollment not found" />
  }

  const eligible = assessment.data?.assessment_eligibility.eligible
  const available = assessment.data?.available

  return (
    <>
      <PageMeta
        title="Final assessment"
        description="Server-scored certification assessment. Answer keys are never shown to learners."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <p className="eyebrow">
              <Link to={`/app/ambassador/certification/enrollments/${id}`}>Learning</Link>
            </p>
            <h1>{assessment.data?.assessment.title ?? 'Final assessment'}</h1>
            <p>
              Scoring and pass/fail are decided by MarcatursHub. Unlimited retakes do not require
              another payment. This UI never awards certification on its own.
            </p>
          </div>
          <ButtonLink to="/app/ambassador/certification" variant="secondary">
            Certification hub
          </ButtonLink>
        </header>

        {assessment.isLoading ? <LoadingState label="Loading assessment…" /> : null}
        {assessment.isError ? (
          <ErrorState title="Could not load assessment">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void assessment.refetch()}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {assessment.isSuccess && !eligible ? (
          <div className="alert alert--info" role="status">
            Complete all required lessons before taking the assessment.{' '}
            <Link to={`/app/ambassador/certification/enrollments/${id}`}>Return to learning</Link>
          </div>
        ) : null}

        {assessment.isSuccess && eligible && !available ? (
          <div className="alert alert--danger" role="alert">
            Assessment content is not available for this enrollment yet.
          </div>
        ) : null}

        {error ? (
          <div className="alert alert--danger" role="alert">
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="card stack" aria-live="polite">
            <h2 style={{ fontSize: '1.15rem' }}>
              {result.passed ? 'Passed' : 'Not passed'}
            </h2>
            <p>
              Score {result.score_percent ?? '—'}% (pass mark {result.pass_mark_percent}%). Correct{' '}
              {result.correct_count ?? '—'}/{result.total_questions ?? '—'}.
            </p>
            {result.passed ? (
              <p>
                If requirements were met, MarcatursHub creates the Award and Certificate on the
                server. PDF generation may still be pending — that does not remove certification.
              </p>
            ) : (
              <p>You can retake without paying again.</p>
            )}
            <div className="inline-actions">
              {result.passed ? (
                <ButtonLink to="/app/ambassador/certification/certificates">
                  View certificates
                </ButtonLink>
              ) : (
                <Button type="button" onClick={() => begin.mutate()} disabled={begin.isPending}>
                  Retake assessment
                </Button>
              )}
            </div>
          </section>
        ) : null}

        {assessment.isSuccess && eligible && available && !result ? (
          <section className="card stack">
            {assessment.data.assessment.instructions ? (
              <p>{assessment.data.assessment.instructions}</p>
            ) : null}
            <p style={{ color: 'var(--color-muted)' }}>
              Pass mark: {assessment.data.assessment.pass_mark_percent ?? '—'}%
            </p>

            {!inProgress ? (
              <Button type="button" onClick={() => begin.mutate()} disabled={begin.isPending}>
                {begin.isPending ? 'Starting…' : 'Start attempt'}
              </Button>
            ) : (
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault()
                  submit.mutate()
                }}
              >
                {questions.map((question, index) => (
                  <fieldset key={question.id} className="cert-row cert-question">
                    <legend>
                      Question {index + 1}. {question.prompt}
                    </legend>
                    <div className="stack" style={{ marginTop: '0.75rem' }}>
                      {(question.options ?? []).map((option) => (
                        <label key={option.id} className="cert-option">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option.id}
                            checked={answers[question.id] === option.id}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [question.id]: option.id }))
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <Button type="submit" disabled={submit.isPending || questions.length === 0}>
                  {submit.isPending ? 'Submitting…' : 'Submit answers'}
                </Button>
              </form>
            )}
          </section>
        ) : null}

        {attempts.isSuccess && attempts.data.length > 0 ? (
          <section className="card stack">
            <h2 style={{ fontSize: '1.05rem' }}>Attempt history</h2>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {attempts.data.map((attempt) => (
                <li key={attempt.id}>
                  Attempt {attempt.attempt_number}: {attempt.status}
                  {attempt.status === 'submitted'
                    ? ` · ${attempt.passed ? 'passed' : 'failed'} · ${attempt.score_percent ?? '—'}%`
                    : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  )
}
