/**
 * Date/time utilities for handling Japan Standard Time (JST)
 * JST is UTC+9
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // 9 hours in milliseconds

/**
 * Convert a datetime-local string (YYYY-MM-DDTHH:mm) to ISO string in UTC
 * Treats the input as Japan Standard Time (JST)
 */
export function jstToUTC(datetimeLocal: string): string {
  if (!datetimeLocal) {
    return new Date().toISOString();
  }

  // datetime-local format is YYYY-MM-DDTHH:mm (no timezone info)
  // We treat this as JST (UTC+9)
  // To convert to UTC, we need to subtract 9 hours
  
  // Parse the datetime string components
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a Date object treating the input as UTC
  // Then subtract 9 hours to convert from JST to UTC
  const jstDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const utcTime = jstDate.getTime() - JST_OFFSET_MS;
  
  return new Date(utcTime).toISOString();
}

/**
 * Convert UTC ISO string to JST datetime-local string (YYYY-MM-DDTHH:mm)
 */
export function utcToJSTLocal(utcISOString: string): string {
  if (!utcISOString) {
    return '';
  }

  const date = new Date(utcISOString);
  // Add 9 hours to convert from UTC to JST
  const jstTime = date.getTime() + JST_OFFSET_MS;
  const jstDate = new Date(jstTime);
  
  // Format as YYYY-MM-DDTHH:mm (datetime-local format)
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  const hours = String(jstDate.getHours()).padStart(2, '0');
  const minutes = String(jstDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get current time in JST as datetime-local string
 */
export function getCurrentJSTLocal(): string {
  const now = new Date();
  const jstTime = now.getTime() + JST_OFFSET_MS;
  const jstDate = new Date(jstTime);
  
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  const hours = String(jstDate.getHours()).padStart(2, '0');
  const minutes = String(jstDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert UTC ISO string to JST for display
 */
export function formatJST(utcISOString: string): string {
  if (!utcISOString) {
    return '';
  }

  const date = new Date(utcISOString);
  const jstTime = date.getTime() + JST_OFFSET_MS;
  const jstDate = new Date(jstTime);
  
  return jstDate.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

