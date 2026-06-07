"use client"

import { useState, useRef, useCallback } from "react"
import { Printer, Loader2, CheckCircle2, AlertCircle, Bluetooth, BluetoothOff } from "lucide-react"

// Known service UUIDs for thermal printers
const PRINTER_SERVICES = [
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
]

interface PrintReceiptButtonProps {
  outletName: string
  tokenNumber: number | null
  tableName: string | null
  customerName: string | null
  tabId: string
  items: Array<{
    quantity: number
    priceAtTime: number
    isBox?: boolean
    MenuItem: { name: string }
  }>
  totalAmount: number
  paymentMode: string | null
  closedAt: Date | string | null
  accentColor?: string
  isSidebar?: boolean
}

// Generate PLAIN TEXT receipt bytes (no ESC/POS commands - maximum compatibility)
function generateReceiptBytes(data: {
  outletName: string
  tokenNumber: number
  tableName: string | null
  customerName: string
  tabId: string
  items: Array<{ name: string; quantity: number; price: number }>
  totalAmount: number
  paymentMode: string
  closedAt: Date
  isKitchenCopy: boolean
}): Uint8Array {
  const encoder = new TextEncoder()
  const W = 32
  const SEP =  '--------------------------------'
  const DSEP = '================================'
  const STAR = '********************************'
  const DOT =  '................................'
  const LF = '\n'

  function pad(left: string, right: string): string {
    const spaces = W - left.length - right.length
    return left + ' '.repeat(Math.max(1, spaces)) + right
  }

  function center(text: string): string {
    const spaces = Math.max(0, Math.floor((W - text.length) / 2))
    return ' '.repeat(spaces) + text
  }

  const dateStr = data.closedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = data.closedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  let r = ''

  // Header
  r += STAR + LF
  r += LF
  r += LF
  r += center(data.outletName.toUpperCase()) + LF
  r += center('Old Delhi Road, Sankar Nursery') + LF
  r += center('Rajyadharpur, Serampore') + LF
  r += center('Ph: 9432750140') + LF
  r += LF
  if (data.tableName) {
    r += center('TABLE: ' + data.tableName) + LF
    r += LF
  }
  r += STAR + LF

  // Kitchen badge
  if (data.isKitchenCopy) {
    r += LF
    r += center('*** KITCHEN ORDER ***') + LF
    r += DSEP + LF
  }

  // Token
  r += LF
  r += center('+------------------+') + LF
  r += center('|  TOKEN #' + data.tokenNumber + '  |') + LF
  r += center('+------------------+') + LF
  r += LF

  // Customer info
  r += DSEP + LF
  r += ' Customer: ' + data.customerName + LF
  r += ' Date: ' + dateStr + LF
  r += ' Time: ' + timeStr + LF
  r += ' Bill No: #' + data.tabId.slice(-6) + LF
  r += DSEP + LF
  r += LF

  if (data.isKitchenCopy) {
    // Kitchen: Items & qty only
    r += pad(' ITEM', 'QTY ') + LF
    r += SEP + LF
    for (const item of data.items) {
      r += pad(' ' + item.name, item.quantity + ' ') + LF
    }
    r += DSEP + LF
    r += LF
    r += center('*** PREPARE NOW ***') + LF
    r += center('>>> URGENT <<<') + LF
  } else {
    // Customer: Full bill
    r += pad(' ITEM', 'AMOUNT ') + LF
    r += SEP + LF
    for (const item of data.items) {
      const il = ' ' + item.quantity + 'x ' + item.name
      const pr = 'Rs.' + (item.quantity * item.price).toFixed(0) + ' '
      if (il.length + pr.length + 1 > W) {
        r += il + LF
        r += pad('', pr) + LF
      } else {
        r += pad(il, pr) + LF
      }
    }
    r += DOT + LF
    r += pad(' Subtotal:', 'Rs.' + data.totalAmount.toFixed(0) + ' ') + LF
    r += DSEP + LF
    r += LF
    r += center('TOTAL: Rs.' + data.totalAmount.toFixed(0) + '/-') + LF
    r += LF
    r += DSEP + LF
    r += pad(' Paid via:', (data.paymentMode === "UNPAID" ? "PENDING / UNPAID" : data.paymentMode) + ' ') + LF
    r += LF
    r += STAR + LF
    r += center('Thank You!') + LF
    r += center('Visit Again') + LF
    r += LF
    r += center('~ Fulbari Cafe ~') + LF
    r += center('Good Food, Good Mood') + LF
    r += STAR + LF
  }

  // Feed paper
  r += LF + LF + LF + LF + LF

  return encoder.encode(r)
}

export function PrintReceiptButton({
  outletName, tokenNumber, tableName, customerName, tabId,
  items, totalAmount, paymentMode, closedAt,
  accentColor = "amber", isSidebar = false
}: PrintReceiptButtonProps) {
  const [btStatus, setBtStatus] = useState<"disconnected" | "connecting" | "connected" | "error">("disconnected")
  const [printStatus, setPrintStatus] = useState<"idle" | "printing_customer" | "printing_kitchen" | "success" | "error">("idle")
  const [deviceName, setDeviceName] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  
  const charRef = useRef<any>(null)
  const deviceRef = useRef<any>(null)

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)

  // ---- CONNECT PRINTER ----
  async function handleConnect() {
    if (btStatus === "connected") return // Already connected

    setBtStatus("connecting")
    setErrorMsg("")

    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported. Use Chrome.')
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES
      })

      setDeviceName(device.name || device.id || 'Printer')

      if (!device.gatt) throw new Error('GATT not available')

      const server = await device.gatt.connect()

      // Find writable characteristic
      let foundChar: any = null

      for (const uuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(uuid)
          const chars = await service.getCharacteristics()
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              foundChar = c
              console.log('[OK] Found writable char:', c.uuid, 'in service:', uuid)
              break
            }
          }
          if (foundChar) break
        } catch { continue }
      }

      // Fallback: scan all services
      if (!foundChar) {
        try {
          const services = await server.getPrimaryServices()
          for (const service of services) {
            console.log('[Scan] Service:', service.uuid)
            try {
              const chars = await service.getCharacteristics()
              for (const c of chars) {
                console.log('[Scan] Char:', c.uuid, 'write:', c.properties.write, 'writeNoResp:', c.properties.writeWithoutResponse)
                if (c.properties.write || c.properties.writeWithoutResponse) {
                  foundChar = c
                  break
                }
              }
              if (foundChar) break
            } catch { continue }
          }
        } catch (e) {
          console.error('[Scan] Failed:', e)
        }
      }

      if (!foundChar) {
        throw new Error('Printer connected but no writable channel found. It may not support Bluetooth Low Energy (BLE).')
      }

      charRef.current = foundChar
      deviceRef.current = device

      // Listen for disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setBtStatus("disconnected")
        setDeviceName("")
        charRef.current = null
        deviceRef.current = null
      })

      setBtStatus("connected")
    } catch (e: any) {
      console.error('[Connect]', e)
      if (e.name === 'NotFoundError') {
        setBtStatus("disconnected") // User cancelled
      } else {
        setBtStatus("error")
        setErrorMsg(e.message || 'Connection failed')
      }
    }
  }

  // ---- SEND TO PRINTER ----
  async function sendChunks(char: any, data: Uint8Array) {
    const CHUNK = 20 // Very small chunks for maximum compatibility
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK)
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(chunk)
      } else {
        await char.writeValueWithResponse(chunk)
      }
      await new Promise(r => setTimeout(r, 50))
    }
  }

  // ---- PRINT ----
  async function handlePrint(type: 'CUSTOMER' | 'KITCHEN') {
    setPrintStatus(type === 'CUSTOMER' ? "printing_customer" : "printing_kitchen")
    setErrorMsg("")

    const dateObj = closedAt ? (typeof closedAt === 'string' ? new Date(closedAt) : closedAt) : new Date()
    const receiptItems = items.map(item => ({
      name: item.MenuItem.name + (item.isBox ? " (Box)" : ""), quantity: item.quantity, price: item.priceAtTime
    }))
    const baseData = {
      outletName, 
      tokenNumber: tokenNumber || 0, 
      tableName: tableName || null,
      customerName: customerName || 'Walk-in',
      tabId, items: receiptItems, totalAmount, paymentMode: paymentMode || 'N/A', closedAt: dateObj,
    }

    const isKitchen = type === 'KITCHEN'

    // Android: RawBT - single copy based on button clicked
    if (isAndroid) {
      const text = generateReceiptBytes({ ...baseData, isKitchenCopy: isKitchen })
      const decoder = new TextDecoder()
      const base64 = btoa(unescape(encodeURIComponent(decoder.decode(text))))
      window.location.href = 'rawbt:base64,' + base64
      setPrintStatus("success")
      setTimeout(() => setPrintStatus("idle"), 3000)
      return
    }

    // Desktop: Web Bluetooth (must be connected first)
    if (!charRef.current) {
      setPrintStatus("error")
      setErrorMsg("Connect printer first!")
      setTimeout(() => setPrintStatus("idle"), 3000)
      return
    }

    try {
      const bytesToPrint = generateReceiptBytes({ ...baseData, isKitchenCopy: isKitchen })
      await sendChunks(charRef.current, bytesToPrint)
      setPrintStatus("success")
      setTimeout(() => setPrintStatus("idle"), 4000)
    } catch (e: any) {
      console.error('[Print]', e)
      setPrintStatus("error")
      setErrorMsg(e.message || 'Print failed')
      setBtStatus("disconnected")
      charRef.current = null
      setTimeout(() => setPrintStatus("idle"), 5000)
    }
  }

  const isAmber = accentColor === "amber"

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Connect Printer Button (desktop only) */}
      {!isAndroid && (
        <button
          onClick={handleConnect}
          disabled={btStatus === "connecting" || btStatus === "connected"}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${
            btStatus === "connected"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 cursor-default"
              : btStatus === "connecting"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-500 cursor-wait opacity-70"
              : btStatus === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20"
              : "bg-foreground/5 border-border text-muted-foreground hover:bg-foreground/10"
          }`}
        >
          {btStatus === "connected" ? (
            <>
              <Bluetooth className="w-4 h-4 text-emerald-500" />
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
                {deviceName || "Printer"} Connected
              </span>
            </>
          ) : btStatus === "connecting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching for printer...
            </>
          ) : btStatus === "error" ? (
            <>
              <BluetoothOff className="w-4 h-4" />
              Retry Connection
            </>
          ) : (
            <>
              <Bluetooth className="w-4 h-4" />
              Connect Printer
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {btStatus === "error" && errorMsg && (
        <p className="text-[11px] text-red-400/80 text-center leading-tight px-2">{errorMsg}</p>
      )}

      {/* Print Customer Copy */}
      <button
        onClick={() => handlePrint('CUSTOMER')}
        disabled={printStatus.startsWith("printing") || (!isAndroid && btStatus !== "connected")}
        className={`w-full flex items-center justify-center gap-2 ${isSidebar ? "px-3 py-2 text-xs" : "px-4 py-3.5 text-sm"} rounded-xl border font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${
          printStatus === "success"
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
            : printStatus === "error"
            ? "bg-red-500/20 border-red-500/30 text-red-500"
            : isAmber
            ? "bg-orange-600 border-orange-500/50 text-white hover:bg-orange-500 shadow-[0_0_25px_-5px_rgba(249,115,22,0.4)]"
            : "bg-sky-600 border-sky-500/50 text-white hover:bg-sky-500 shadow-[0_0_25px_-5px_rgba(14,165,233,0.4)]"
        }`}
      >
        {printStatus === "printing_customer" ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Printing...</>
        ) : (
          <><Printer className="w-4 h-4" /> Customer Copy</>
        )}
      </button>

      {/* Print Kitchen Copy */}
      <button
        onClick={() => handlePrint('KITCHEN')}
        disabled={printStatus.startsWith("printing") || (!isAndroid && btStatus !== "connected")}
        className={`w-full flex items-center justify-center gap-2 ${isSidebar ? "px-3 py-2 text-xs" : "px-4 py-3.5 text-sm"} rounded-xl border font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${
          printStatus === "success"
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
            : printStatus === "error"
            ? "bg-red-500/20 border-red-500/30 text-red-500"
            : "bg-purple-600 border-purple-500/50 text-foreground hover:bg-purple-500 shadow-[0_0_25px_-5px_rgba(147,51,234,0.4)]"
        }`}
      >
        {printStatus === "printing_kitchen" ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Printing...</>
        ) : (
          <><Printer className="w-4 h-4" /> Kitchen Copy</>
        )}
      </button>

      {tokenNumber && (
        <span className="text-[10px] text-muted-foreground mt-2">
          Token #{tokenNumber}
        </span>
      )}
    </div>
  )
}
