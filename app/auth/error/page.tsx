import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-4 text-center">
        There was an error with the authentication process. This could be due to an expired or invalid link.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
