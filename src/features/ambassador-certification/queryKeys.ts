export const certificationKeys = {
  all: ['ambassador-certification'] as const,
  programmes: () => [...certificationKeys.all, 'programmes'] as const,
  programme: (id: number) => [...certificationKeys.all, 'programme', id] as const,
  enrollments: () => [...certificationKeys.all, 'enrollments'] as const,
  enrollment: (id: number) => [...certificationKeys.all, 'enrollment', id] as const,
  curriculum: (id: number) => [...certificationKeys.all, 'curriculum', id] as const,
  assessment: (id: number) => [...certificationKeys.all, 'assessment', id] as const,
  attempts: (id: number) => [...certificationKeys.all, 'attempts', id] as const,
  certificates: () => [...certificationKeys.all, 'certificates'] as const,
  certificate: (id: number) => [...certificationKeys.all, 'certificate', id] as const,
  awards: () => [...certificationKeys.all, 'awards'] as const,
}
