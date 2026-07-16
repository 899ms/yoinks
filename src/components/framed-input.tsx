import React, {type ReactNode} from 'react'
import {Box, Text} from 'ink'
import {theme} from '../theme.js'

/**
 * A single-line input frame with the title sitting on the top border,
 * like `╭─ Paste a link ────╮`. Drawn by hand because ink borders
 * don't support embedded titles.
 */
export function FramedInput({title, width, children}: {title: string; width: number; children: ReactNode}) {
  const inner = width - 2
  const tail = Math.max(0, inner - title.length - 3)
  return (
    <Box flexDirection="column" width={width}>
      <Text>
        <Text color={theme.border}>{'╭─ '}</Text>
        <Text color={theme.text}>{title}</Text>
        <Text color={theme.border}>{` ${'─'.repeat(tail)}╮`}</Text>
      </Text>
      <Box width={width} height={1} overflow="hidden">
        <Text color={theme.border}>│ </Text>
        <Text color={theme.bright}>❯ </Text>
        <Box flexGrow={1} height={1} overflow="hidden">
          {children}
        </Box>
        <Text color={theme.border}> │</Text>
      </Box>
      <Text color={theme.border}>{`╰${'─'.repeat(inner)}╯`}</Text>
    </Box>
  )
}
