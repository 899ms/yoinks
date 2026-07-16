import React from 'react'
import {Box, Text} from 'ink'
import {theme} from '../theme.js'

const ART = [
  '             _       _        ',
  ' _   _  ___ (_)_ __ | | _____ ',
  '| | | |/ _ \\| | \'_ \\| |/ / __|',
  '| |_| | (_) | | | | |   <\\__ \\',
  ' \\__, |\\___/|_|_| |_|_|\\_\\___/',
  ' |___/                        ',
]

export function Logo() {
  return (
    <Box flexDirection="column">
      {ART.map((line, row) => (
        <Text key={row} color={theme.logo[row]}>
          {line}
        </Text>
      ))}
    </Box>
  )
}
