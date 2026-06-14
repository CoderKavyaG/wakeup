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
  const [reconnectTrigger, setReconnectTrigger] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const xtermRef = useRef<any>(null)

  useEffect(() => {
    let term: any
    let ws: WebSocket
    let reconnectTimeout: NodeJS.Timeout
    let isMounted = true

    const init = async () => {
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')
      const { WebLinksAddon } = await import('xterm-addon-web-links')
      
      // Load styles dynamically
      if (!document.getElementById('xterm-style')) {
        const link = document.createElement('link')
        link.id = 'xterm-style'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css'
        document.head.appendChild(link)
      }

      term = new Terminal({
        theme: {
          background: '#0f0f11',
          foreground: '#e2e8f0',
          cursor: '#f59e0b',
          selectionBackground: 'rgba(245, 158, 11, 0.3)',
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

      ws.onopen = () => {
        if (isMounted) setStatus('connected')
      }
      
      let isDisconnecting = false;
      const handleDisconnect = () => {
        if (!isMounted || isDisconnecting) return;
        isDisconnecting = true;
        setStatus('disconnected');
        
        reconnectTimeout = setTimeout(async () => {
          if (!isMounted) return;
          setStatus('connecting');
          try {
            await fetch('/api/machine/start-agent', { method: 'POST' }).catch(() => {});
          } catch (e) {}
          if (isMounted) {
            setReconnectTrigger(prev => prev + 1);
          }
        }, 1500);
      };

      ws.onclose = handleDisconnect
      ws.onerror = handleDisconnect

      ws.onmessage = (e) => {
        if (isMounted) term.write(e.data)
      }
      
      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data)
      })
    }

    init()

    return () => {
      isMounted = false
      clearTimeout(reconnectTimeout)
      ws?.close()
      term?.dispose()
    }
  }, [initialCwd, reconnectTrigger])

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

  const quickCommands = [
    { label: 'git status', cmd: 'git status' },
    { label: 'dev server', cmd: 'npm run dev' },
    { label: 'prisma studio', cmd: 'npx prisma studio' },
    { label: 'npm install', cmd: 'npm install' },
    { label: 'clear', cmd: 'clear' }
  ]

  const runQuickCommand = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd + '\r\n')
    }
  }

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
          {onClose && <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs ml-2 cursor-pointer">✕</button>}
        </div>
      </div>

      {/* Quick Commands bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/10 border-b border-white/[0.04] overflow-x-auto custom-scrollbar shrink-0 select-none">
        <span className="text-[9px] text-white/30 uppercase font-mono tracking-wider mr-1">Quick:</span>
        {quickCommands.map((q) => (
          <button
            key={q.label}
            onClick={() => runQuickCommand(q.cmd)}
            disabled={status !== 'connected'}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#16161a] border border-white/[0.04] text-white/60 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all disabled:opacity-40 disabled:hover:text-white/60 disabled:hover:border-white/[0.04] disabled:hover:bg-[#16161a] cursor-pointer"
          >
            {q.label}
          </button>
        ))}
      </div>

      <div ref={termRef} className="flex-1 min-h-0 relative p-2" />
    </div>
  )
}
