import React from 'react'
import {Text} from 'ink'
import {theme} from '../theme.js'

export function Shortcuts({items}: {items: Array<[key: string, label: string]>}) {
  return (
    <Text>
      {items.map(([key, label], index) => (
        <Text key={`${key}-${label}`}>
          {index > 0 ? <Text dimColor>{'  ·  '}</Text> : null}
          <Text color={theme.text}>{key}</Text>
          <Text dimColor> {label}</Text>
        </Text>
      ))}
    </Text>
  )
}
