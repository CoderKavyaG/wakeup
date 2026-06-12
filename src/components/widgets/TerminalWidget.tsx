'use client'
import { useEffect, useRef, useState } from 'react'
import { useTerminalStore } from '@/store/useTerminalStore'

interface TerminalWidgetProps {
  initialCwd?: string
  onClose?: () => void
}

export function TerminalWidget({ initialCwd, onClose }: TerminalWidgetProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const xtermRef = useRef<any>(null)

  useEffect(() => {
    let term: any
    let ws: WebSocket

    const init = async () => {
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')
      const { WebLinksAddon } = await import('xterm-addon-web-links')
      
      // Load styles dynamically


      term = new Terminal({
        theme: {
          background: '#0f0f11',
          foreground: '#e2e8f0',
          cursor: '#7c3aed',
          selectionBackground: 'rgba(124, 58, 237, 0.3)',
          black: '#1e1e2e', red: '#f38ba8', green: '#a6e3a1',
          yellow: '#f9e2af', blue: '#89b4fa', magenta: '#cba6f7',
          cyan: '#89dceb', white: '#cdd6f4',
        },
        fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 1000,
      })

      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon((e: any, url: string) => window.open(url, '_blank'))

      term.loadAddon(fitAddon)
      term.loadAddon(webLinksAddon)

      if (termRef.current) {
        term.open(termRef.current)
        fitAddon.fit()
        xtermRef.current = term

        const ro = new ResizeObserver(() => {
          try { fitAddon.fit() } catch(e) {}
        })
        ro.observe(termRef.current)
      }

      const cwd = initialCwd || ''
      ws = new WebSocket(`ws://localhost:3132${cwd ? `?cwd=${encodeURIComponent(cwd)}` : ''}`)
      wsRef.current = ws

      ws.onopen = () => setStatus('connected')
      ws.onclose = () => setStatus('disconnected')
      ws.onerror = () => setStatus('disconnected')

      ws.onmessage = (e) => term.write(e.data)
      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data)
      })
    }

    init()

    return () => {
      ws?.close()
      term?.dispose()
    }
  }, [initialCwd])

  const pendingCommand = useTerminalStore((s) => s.pendingCommand);
  const clearCommand = useTerminalStore((s) => s.clearCommand);

  // Watch for commands via Zustand store
  useEffect(() => {
    if (pendingCommand && status === 'connected' && wsRef.current) {
      const { cwd, command } = pendingCommand;
      if (!initialCwd || cwd === initialCwd) {
        console.log("TerminalWidget: Executing pending command:", command);
        wsRef.current.send(command + '\r\n');
        clearCommand();
      }
    }
  }, [pendingCommand, status, initialCwd, clearCommand]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f11] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Terminal</span>
          {initialCwd && <span className="text-[10px] font-mono text-primary/70">{initialCwd.split(/[/\\]/).pop()}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
          }`} />
          <span className="text-[10px] uppercase font-bold text-muted-foreground">{status}</span>
          {onClose && <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs ml-2">✕</button>}
        </div>
      </div>
      <div ref={termRef} className="flex-1 min-h-0 relative p-2" />
    </div>
  )
}
