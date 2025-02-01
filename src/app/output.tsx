export function Output({ output }: { output: string }) {
  if (output)
    return (
      <div
        className='p-4 mb-4 text-sm text-gray-800  rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400'
        role='alert'
      >
        <span className='font-medium'>{output}</span>
      </div>
    )
}
