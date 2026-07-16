import React, {useCallback, useEffect, useRef, useState} from 'react'
import os from 'node:os'
import path from 'node:path'
import {Box, Text, useApp, useInput, useStdout} from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import TextInput from 'ink-text-input'
import {FramedInput} from './components/framed-input.js'
import {FullScreen} from './components/fullscreen.js'
import {Logo} from './components/logo.js'
import {Panel} from './components/panel.js'
import {ProgressBar} from './components/progress-bar.js'
import {Shortcuts} from './components/shortcuts.js'
import {formatBytes, formatDuration, formatEta, formatSpeed, shortenPath, truncate} from './lib/format.js'
import {detectPlatform, isProbablyUrl, type Platform} from './lib/platforms.js'
import {theme} from './theme.js'
import {
  buildChoices,
  download,
  ensureYtDlp,
  findFfmpeg,
  probe,
  type DownloadChoice,
  type DownloadProgress,
  type VideoInfo,
} from './lib/ytdlp.js'

const OUT_DIR = path.join(os.homedir(), 'Downloads')

// explicit blank lines — empty <Box height={1}/> spacers can collapse
const Gap = ({lines = 1}: {lines?: number}) => (
  <Box flexDirection="column">
    {Array.from({length: lines}, (_, i) => (
      <Text key={i}> </Text>
    ))}
  </Box>
)

export type Outcome = {filepath?: string}

type Phase =
  | {name: 'input'; warning?: string}
  | {name: 'probing'; status: string}
  | {name: 'picking'}
  | {name: 'downloading'; choice: DownloadChoice; progress?: DownloadProgress; processing: boolean}
  | {name: 'done'; filepath: string}
  | {name: 'error'; message: string}

const HINTS: Record<Phase['name'], Array<[string, string]>> = {
  input: [
    ['↵', 'yoink'],
    ['^c', 'quit'],
  ],
  probing: [['^c', 'quit']],
  picking: [
    ['↑↓', 'choose'],
    ['↵', 'yoink'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  downloading: [['^c', 'quit']],
  done: [['^c', 'quit']],
  error: [
    ['↵', 'try again'],
    ['^c', 'quit'],
  ],
}

export function App({initialUrl, onOutcome}: {initialUrl?: string; onOutcome: (outcome: Outcome) => void}) {
  const {exit} = useApp()
  const {stdout} = useStdout()
  const [url, setUrl] = useState(initialUrl ?? '')
  const [urlInput, setUrlInput] = useState('')
  const [platform, setPlatform] = useState<Platform>()
  const [info, setInfo] = useState<VideoInfo>()
  const [choices, setChoices] = useState<DownloadChoice[]>([])
  const ytdlpRef = useRef('')
  const infoJsonRef = useRef<string | undefined>(undefined)
  const [phase, setPhase] = useState<Phase>(initialUrl ? {name: 'probing', status: 'warming up…'} : {name: 'input'})

  const columns = stdout?.columns ?? 80
  const boxWidth = Math.min(64, columns - 6)

  const startProbe = useCallback(async (targetUrl: string) => {
    setPlatform(detectPlatform(targetUrl))
    setPhase({name: 'probing', status: 'warming up…'})
    try {
      const ytdlp =
        ytdlpRef.current || (await ensureYtDlp(status => setPhase({name: 'probing', status})))
      ytdlpRef.current = ytdlp
      setPhase({name: 'probing', status: 'fetching video info…'})
      const {info: videoInfo, infoJsonPath} = await probe(ytdlp, targetUrl)
      infoJsonRef.current = infoJsonPath
      setInfo(videoInfo)
      setChoices(buildChoices(videoInfo))
      setPhase({name: 'picking'})
    } catch (error) {
      setPhase({name: 'error', message: error instanceof Error ? error.message : String(error)})
    }
  }, [])

  useEffect(() => {
    if (initialUrl) void startProbe(initialUrl)
  }, [initialUrl, startProbe])

  const resetToInput = useCallback(() => {
    setUrl('')
    setUrlInput('')
    setPlatform(undefined)
    setInfo(undefined)
    setChoices([])
    setPhase({name: 'input'})
  }, [])

  useInput(
    (_input, key) => {
      if (key.escape && (phase.name === 'picking' || phase.name === 'error')) resetToInput()
      if (key.return && (phase.name === 'error' || phase.name === 'done')) resetToInput()
    },
    {isActive: Boolean(process.stdin.isTTY)},
  )

  const handleUrlSubmit = (value: string) => {
    const trimmed = value.trim()
    if (!isProbablyUrl(trimmed)) {
      setPhase({name: 'input', warning: 'that doesn’t look like a link — paste a full url'})
      return
    }
    setUrl(trimmed)
    void startProbe(trimmed)
  }

  const handlePick = (item: {value: number}) => {
    const choice = choices[item.value]
    setPhase({name: 'downloading', choice, processing: false})
    void (async () => {
      const handlers = {
        onProgress: (progress: DownloadProgress) =>
          setPhase(prev => (prev.name === 'downloading' ? {...prev, progress, processing: false} : prev)),
        onProcessing: () =>
          setPhase(prev => (prev.name === 'downloading' ? {...prev, processing: true} : prev)),
      }
      try {
        const ffmpegLocation = await findFfmpeg()
        const base = {ytdlp: ytdlpRef.current, ffmpegLocation, url, choice, outDir: OUT_DIR}
        let filepath: string
        try {
          // reuse the probe's metadata — starts immediately instead of re-extracting
          filepath = await download({...base, infoJsonPath: infoJsonRef.current}, handlers)
        } catch {
          // media urls in the cached info can expire — retry with a fresh extraction
          setPhase(prev => (prev.name === 'downloading' ? {...prev, progress: undefined} : prev))
          filepath = await download(base, handlers)
        }
        onOutcome({filepath})
        setPhase({name: 'done', filepath})
      } catch (error) {
        setPhase({name: 'error', message: error instanceof Error ? error.message : String(error)})
      }
    })()
  }

  const hints = HINTS[phase.name]

  return (
    <FullScreen>
      <Logo />
      <Gap lines={2} />
      <Text color={theme.text}>yoink any video. no shady ads.</Text>
      <Text dimColor>youtube · x · instagram · threads · tiktok · +1800 more</Text>
      <Gap />

      {phase.name === 'input' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput title="Paste a link" width={boxWidth}>
            <TextInput
              value={urlInput}
              onChange={setUrlInput}
              onSubmit={handleUrlSubmit}
              placeholder="https://youtube.com/watch?v=…"
            />
          </FramedInput>
          {phase.warning ? <Text color={theme.muted}>✗ {phase.warning}</Text> : null}
        </Box>
      )}

      {phase.name === 'probing' && (
        <Box flexDirection="column" alignItems="center">
          <FramedInput title={platform ? platform.label : 'Paste a link'} width={boxWidth}>
            <Text dimColor>{url.length > boxWidth - 8 ? `${url.slice(0, boxWidth - 9)}…` : url}</Text>
          </FramedInput>
          <Gap />
          <Text>
            <Text color={theme.text}>
              <Spinner type="dots" />
            </Text>
            <Text dimColor> {phase.status}</Text>
          </Text>
        </Box>
      )}

      {phase.name === 'picking' && platform && (
        <Box width={Math.min(columns - 4, 78)}>
          <Box flexDirection="column" flexGrow={1} flexBasis={0} paddingTop={1} paddingRight={3}>
            <Text bold color={theme.bright}>
              {info?.title}
            </Text>
            <Gap />
            <Text dimColor>
              ▸ {platform.label}
              {info?.duration ? ` · ${formatDuration(info.duration)}` : ''}
              {info?.uploader ? ` · ${info.uploader}` : ''}
            </Text>
          </Box>
          <Panel title="Download" width={38}>
            <SelectInput
              items={choices.map((choice, index) => ({
                key: String(index),
                label: `${choice.kind === 'audio' ? '♪ ' : '▶ '}${choice.label}`,
                value: index,
              }))}
              onSelect={handlePick}
            />
          </Panel>
        </Box>
      )}

      {phase.name === 'downloading' && (
        <Box flexDirection="column" alignItems="center">
          <Text dimColor>
            {info?.title ? `${truncate(info.title, 42)} · ` : ''}
            {phase.choice.label}
          </Text>
          <Gap />
          {phase.processing ? (
            <Text>
              <Text color={theme.text}>
                <Spinner type="dots" />
              </Text>
              <Text dimColor> processing…</Text>
            </Text>
          ) : phase.progress?.totalBytes ? (
            <Text>
              <ProgressBar percent={phase.progress.downloadedBytes / phase.progress.totalBytes} />
              {phase.progress.speed ? <Text dimColor> · {formatSpeed(phase.progress.speed)}</Text> : null}
              {phase.progress.eta ? <Text dimColor> · {formatEta(phase.progress.eta)} left</Text> : null}
            </Text>
          ) : phase.progress ? (
            <Text>
              <Text color={theme.text}>
                <Spinner type="dots" />
              </Text>
              <Text dimColor> downloading · {formatBytes(phase.progress.downloadedBytes)}</Text>
              {phase.progress.speed ? <Text dimColor> · {formatSpeed(phase.progress.speed)}</Text> : null}
            </Text>
          ) : (
            <Text>
              <Text color={theme.text}>
                <Spinner type="dots" />
              </Text>
              <Text dimColor> starting download…</Text>
            </Text>
          )}
        </Box>
      )}

      {phase.name === 'done' && (
        <Box flexDirection="column" alignItems="center">
          <Text>
            <Text bold color={theme.bright}>✓ yoinked! </Text>
            <Text color={theme.text}>find your file in:</Text>
          </Text>
          <Text dimColor>{shortenPath(phase.filepath, os.homedir(), 60)}</Text>
          <Gap />
          <Box borderStyle="round" borderColor={theme.text} paddingX={3}>
            <Text bold color={theme.bright}>↵ yoink another</Text>
          </Box>
        </Box>
      )}

      {phase.name === 'error' && (
        <Box flexDirection="column" alignItems="center" width={Math.min(columns - 6, 72)}>
          <Text bold color={theme.bright}>✗ {phase.message}</Text>
        </Box>
      )}

      {hints.length > 0 ? (
        <>
          <Gap lines={2} />
          <Shortcuts items={hints} />
        </>
      ) : null}
    </FullScreen>
  )
}
