#!/usr/bin/env node


// Copyright © 2020 Deniz Akşimşek
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the 
// “Software”), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish, 
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const //
  fs = require('fs'),
  path = require('path'),
  moment = require('moment')

function parse(filename, text) {
  const lines = text.split('\n').filter(line => !isComment(line))
  const blocks = parseBlocks(lines)
  const {title, body} = separateTitle(blocks)
  const baseDate = moment(title).set({ hours: 0, minutes: 0 })
  const events = body.map(block => parseEvent(baseDate, block))

  return {
    filename,
    title,
    events
  }
}

function isComment(line) {
  return /^\s*;/.test(line)
}

function lineIsEmpty(line) {
  return line.length == 0 || /^\s*$/.test(line)
}

function parseEvent(baseDate, block) {
  let currentIndex = 0
  function eatLine() {
    return block[currentIndex++]
  }

  const {startTime, endTime, isAllDay, reminder} = parseTimeHeader(baseDate, eatLine())

  const title = eatLine()

  const descriptionLines = [],
    tags = [],
    attachments = [],
    people = [],
    locations = []

  let line
  while ((line = eatLine()) !== undefined) {
    const restOfLine = () => line.substring(2)
    switch (line.substring(0, 2)) {
      case '# ':
        tags.push(...parseTags(restOfLine()));
        break
      case '& ':
        attachments.push(restOfLine());
        break
      case '~ ':
        people.push(...parsePeople(restOfLine()));
        break
      case '@ ':
        locations.push(restOfLine());
        break
      default:
        descriptionLines.push(line)
    }
  }

  return {
    startTime,
    endTime,
    isAllDay,
    reminder,
    title,
    tags,
    attachments,
    people,
    locations,
    description: descriptionLines.join('\n')
  }
}

function parseTags(tagsStr) {
  return tagsStr.split(',')
}

function parsePeople(peopleStr) {
  // TODO: parse identifiers of the form:
  //     John Doe <jdoe@example.com>
  return peopleStr.split(',')
}

function parseBlocks(lines) {
  const rv = [[]]
  let currentGroup = rv[0]
  for (const line of lines) {
    if (lineIsEmpty(line)) {
      rv.push(currentGroup = [])
    } else {
      currentGroup.push(line)
    }
  }

  return rv.filter(block => block.length > 0)
}

/** 
The format for the time header is as follows:

    TimeOfDay?   "--"   TimeOfDay?          ("!" Duration)?
    ^^^^^^^^^           ^^^^^^^^^                ^^^^^^^^
    Start time          End time or duration     Reminder

If start time is present but end time or duration is not, it is assumed to be "1h".

If neither start time nor end time (or duration) is present (just the "--"), the
event is all-day -- isAllDay is true.

If start time is not present but end time is, it is ignored and the event is 
all-day.
 */
function parseTimeHeader(baseDate, line) {
  const [startTimeStr, endTimeStr, reminderStr] = line.split(/--|!/)

  const isAllDay = startTimeStr.trim() === ''

  const startTime = isAllDay ? moment(baseDate) : startTimeStr && parseTimeOfDay(baseDate, startTimeStr)
  const endTime = isAllDay ? moment(baseDate) : endTimeStr && parseTimeOfDay(baseDate, endTimeStr)

  if (isAllDay) endTime.add(1, 'd')

  const reminder = reminderStr && parseDuration(reminderStr)
  return {
    isAllDay,
    startTime,
    endTime,
    reminder
  }
}

function parseTimeOfDay(baseDate, timeOfDayStr) {
  const [hours, minutes] = timeOfDayStr.trim().split(/\.|:/)
  return moment(baseDate).add({
    hours,
    minutes
  })
}

function parseDuration(str) {
  str = str.trim()
  const {number, unit} = /(?<number>\d+)(?<unit>[a-zA-Z])/.exec(str).groups
  return moment.duration(-number, unit)
}

/**
The title block is a single line, starting and ending with double equals signs;
its contents are the date.

For example:
    
    == 2020-07-14 Monday ==

 */
function separateTitle(blocks) {
  return {
    title: /^= (?<title>.*) =/.exec(blocks[0][0]).groups.title,
    body: blocks.slice(1)
  }
}


function dotDayReplacer(obj) {
  if (moment.isDuration(obj)) return obj.toISOString()
  return obj
}

function hash(str) {
  var hash = 0,
    i,
    chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
}

function escapeValue(val) {
  return val
    .replace(/(,|;|\\)/, '\\$1')
    .replace(/\n/, '\\n')
}

function exportIcs(calendarName, parsedFiles) {
  const output = []

  output.push(
    `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Deniz Akşimşek//NONSGML DotDay-JS//EN
CALSCALE:GREGORIAN
X-WR-CALNAME:${calendarName}
X-PUBLISHED-TTL:PT30m
REFRESH-INTERVAL;VALUE=DURATION:P30m`)

  for (const file of parsedFiles) {
    let index = 0
    for (const event of file.events) {
      output.push(
        `BEGIN:VEVENT
UID:${hash(calendarName + file.relativePath + index++)}
DTSTART${event.isAllDay ? ';VALUE=DATE' : ''}:${event.isAllDay ? event.startTime.format('YYYYMMDD') : event.startTime.format('YYYYMMDDTHHmmss') || ''}
DTEND${event.isAllDay ? ';VALUE=DATE' : ''}:${event.isAllDay ? event.endTime.format('YYYYMMDD') : event.endTime.format('YYYYMMDDTHHmmss') || ''}
DTSTAMP:${event.startTime.format('YYYYMMDDTHHmmss') || ''}
CREATED:${file.created || ''}
LAST-MODIFIED:${file.lastModified || ''}
SUMMARY:${escapeValue(event.title)}
DESCRIPTION:${escapeValue(event.description)}
LOCATION:${event.locations ? event.locations[event.locations.length - 1] : ''}
${event.people.map(person => 
  `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT:${person}\n`)
}${event.attachments.map(attachment =>
  `ATTACH:${attachment}\n`)
}SEQUENCE:0
STATUS:CONFIRMED
TRANSP:OPAQUE`)

      if ('reminder' in event) {
        output.push(`BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:This is an event reminder
TRIGGER:${event.reminder}
END:VALARM`)
      }
      output.push(`END:VEVENT`)
    }
  }

  output.push(`END:VCALENDAR\r\n`)

  return output.join('\n').replace(/\r\n/gm, "\n")
                 .replace(/\n/gm,   "\r\n")
}

function main() {
  const dir = process.argv[2] || './samples'
  const filenames = fs.readdirSync(dir)
  const days = filenames
    .filter(filename => fs.lstatSync(path.join(dir, filename)).isFile() 
      && path.extname(filename) === 'day')
    .map(filename => parse(
      filename,
      fs.readFileSync(path.join(dir, filename)).toString()
    ))
  fs.writeFileSync(process.argv[3], exportIcs(dir, days))
}

main()
