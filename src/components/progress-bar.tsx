import React from 'react'
import {Text} from 'ink'
import {theme} from '../theme.js'

export function ProgressBar({percent, width = 30}: {percent: number; width?: number}) {
  const clamped = Math.max(0, Math.min(1, percent))
  const filled = Math.round(clamped * width)
  return (
    <Text>
      <Text color={theme.bright}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(width - filled)}</Text>
      <Text color={theme.text}> {Math.round(clamped * 100)}%</Text>
    </Text>
  )
}
