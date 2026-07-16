import React, {type ReactNode} from 'react'
import {Box, Text} from 'ink'
import {theme} from '../theme.js'

/**
 * A bordered panel with the title on the top border, sized to its content:
 * the top line is drawn by hand (ink borders can't embed titles), the
 * sides and bottom come from ink with borderTop disabled.
 */
export function Panel({title, width, children}: {title: string; width: number; children: ReactNode}) {
  const inner = width - 2
  const tail = Math.max(0, inner - title.length - 3)
  return (
    <Box flexDirection="column" width={width}>
      <Text>
        <Text color={theme.border}>{'╭─ '}</Text>
        <Text color={theme.text}>{title}</Text>
        <Text color={theme.border}>{` ${'─'.repeat(tail)}╮`}</Text>
      </Text>
      <Box
        width={width}
        borderStyle="round"
        borderColor={theme.border}
        borderTop={false}
        flexDirection="column"
        paddingX={2}
      >
        {children}
      </Box>
    </Box>
  )
}
