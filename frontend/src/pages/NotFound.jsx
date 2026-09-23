import React from 'react'

const NotFound = () => {
  return (
    <div className='flex flex-col grow justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'>
      <div className='text-center'>
        <h1 className='text-6xl font-bold text-gray-800'>404</h1>
        <p className='mt-4 text-lg text-gray-600'>Page Not Found</p>
        <p className='mt-2 text-sm text-gray-500'>The page you are looking for does not exist.</p>
      </div>
      <div className='mt-8 text-center'>
        <a href='/' className='text-teal-500 hover:underline'>Go back to Home</a>
      </div>
    </div>
  )
}

export default NotFound