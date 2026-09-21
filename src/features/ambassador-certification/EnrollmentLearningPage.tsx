import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  completeLesson,
  downloadAuthenticatedFile,
  fetchCurriculum,
  lessonResourceDownloadUrl,
} from './api'
import { certificationKeys } from './queryKeys'

export function EnrollmentLearningPage() {
  const { enrollmentId } = useParams()
  const id = Number(enrollmentId)
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyLessonId, setBusyLessonId] = useState<number | null>(null)

  const curriculum = useQuery({
    queryKey: certificationKeys.curriculum(id),
    queryFn: ({ signal }) => fetchCurriculum(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const markComplete = useMutation({
    mutationFn: (lessonId: number) => completeLesson(id, lessonId),
    onMutate: (lessonId) => {
      setBusyLessonId(lessonId)
      setActionError(null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: certificationKeys.curriculum(id) })
    },
    onError: (err) => {
      setActionError(err instanceof ApiClientError ? err.message : 'Could not mark lesson complete.')
    },
    onSettled: () => setBusyLessonId(null),
  })

  if (!Number.isFinite(id) || id < 1) {
    return <ErrorState title="Enrollment not found" />
  }

  const eligibility = curriculum.data?.assessment_eligibility

  return (
    <>
      <PageMeta
        title="Certification learning"
        description="Enrollment-bound curriculum and lesson progress."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <p className="eyebrow">
              <Link to="/app/ambassador/certification">Certification</Link>
            </p>
            <h1>
              {curriculum.data?.enrollment.programme?.name ?? 'Learning'}
            </h1>
            <p>
              Opening a lesson does not complete it. Mark complete when finished. Required lessons
              unlock the final assessment; optional lessons do not block.
            </p>
          </div>
          {eligibility?.eligible ? (
            <ButtonLink to={`/app/ambassador/certification/enrollments/${id}/assessment`}>
              Take assessment
            </ButtonLink>
          ) : null}
        </header>

        {curriculum.isLoading ? <LoadingState label="Loading curriculum…" /> : null}
        {curriculum.isError ? (
          <ErrorState title="Could not load curriculum">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void curriculum.refetch()}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {curriculum.isSuccess ? (
          <div className="stack">
            <section className="card stack" aria-live="polite">
              <h2 style={{ fontSize: '1.1rem' }}>Assessment eligibility</h2>
              <p>
                Required lessons completed:{' '}
                {eligibility?.completed_required_lessons ?? 0}/
                {eligibility?.required_lessons ?? 0}
              </p>
              <p style={{ color: 'var(--color-muted)' }}>
                {eligibility?.eligible
                  ? 'You are eligible for the final assessment.'
                  : 'Complete all required lessons to unlock the assessment.'}
              </p>
            </section>

            {actionError ? (
              <div className="alert alert--danger" role="alert">
                {actionError}
              </div>
            ) : null}

            {curriculum.data.modules.map((module) => (
              <section key={module.id} className="card stack" aria-labelledby={`module-${module.id}`}>
                <h2 id={`module-${module.id}`} style={{ fontSize: '1.15rem' }}>
                  {module.title}
                </h2>
                {module.description ? (
                  <p style={{ color: 'var(--color-muted)' }}>{module.description}</p>
                ) : null}
                <ul className="cert-row-list">
                  {module.lessons.map((lesson) => {
                    const completed = lesson.progress.status === 'completed'
                    return (
                      <li key={lesson.id} className="cert-row">
                        <div className="stack">
                          <div>
                            <strong>{lesson.title}</strong>
                            <p className="cert-row__meta">
                              <span
                                className={`badge ${lesson.is_required ? 'badge--accent' : 'badge--neutral'}`}
                              >
                                {lesson.is_required ? 'Required' : 'Optional'}
                              </span>{' '}
                              <span className="badge badge--neutral">
                                {lesson.progress.status.replaceAll('_', ' ')}
                              </span>
                            </p>
                            {lesson.description ? <p>{lesson.description}</p> : null}
                          </div>
                          {lesson.resources.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                              {lesson.resources.map((resource) => (
                                <li key={resource.id}>
                                  {resource.external_url ? (
                                    <a
                                      href={resource.external_url}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                    >
                                      {resource.title}
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn--secondary btn--sm"
                                      onClick={() => {
                                        void downloadAuthenticatedFile(
                                          lessonResourceDownloadUrl(id, lesson.id, resource.id),
                                          resource.original_filename || resource.title || 'resource',
                                        ).catch((err: unknown) => {
                                          setActionError(
                                            err instanceof Error
                                              ? err.message
                                              : 'Resource download failed.',
                                          )
                                        })
                                      }}
                                    >
                                      Download {resource.title}
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant={completed ? 'secondary' : 'primary'}
                            disabled={completed || busyLessonId === lesson.id}
                            onClick={() => markComplete.mutate(lesson.id)}
                          >
                            {completed
                              ? 'Completed'
                              : busyLessonId === lesson.id
                                ? 'Saving…'
                                : 'Mark complete'}
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
