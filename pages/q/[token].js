import { useRouter } from 'next/router'
import { useEffect } from 'react'

// Route courte /q/TOKEN qui redirige vers /questionnaire/TOKEN
export default function RedirectQuestionnaire() {
  const router = useRouter()
  const { token } = router.query

  useEffect(() => {
    if (token) {
      router.replace('/questionnaire/' + token)
    }
  }, [token])

  return null
}
