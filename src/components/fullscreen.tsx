import React, {useEffect, useState, type ReactNode} from 'react'
import {Box, useStdout} from 'ink'

export function FullScreen({children}: {children: ReactNode}) {
  const {stdout} = useStdout()
  const [size, setSize] = useState({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  })

  useEffect(() => {
    if (!stdout) return
    const onResize = () => setSize({columns: stdout.columns, rows: stdout.rows})
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  return (
    <Box
      width={size.columns}
      height={size.rows - 1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      {children}
    </Box>
  )
}
