
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
  const baseDate = moment(filename.split('.')[0] + "T00:00")
  const lines = text.split('\n').filter(line => !isComment(line))
  const blocks = parseBlocks(lines)
  const {title, body} = separateTitle(blocks)
  const events = body.map(block => parseEvent(baseDate, block))

  return {
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

  const startTime = isAllDay ? undefined : startTimeStr && parseTimeOfDay(baseDate, startTimeStr)
  const endTime = isAllDay ? undefined : endTimeStr && parseTimeOfDay(baseDate, endTimeStr)

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
The title block is a single line of text followed by a line of at least 3 equals
signs and optionally some whitespace.

For example:
    
    CONFERENCE DAY 1
    ================

The line immediately after the equals signs is reserved for future use.
 */
function separateTitle(blocks) {
  if (/^={3,}\s*$/.test(blocks[0][1])) {
    return {
      title: blocks[0][0],
      body: blocks.slice(1)
    }
  } else return {
      body: blocks
  }
}


function dotDayReplacer(obj) {
  if (moment.isDuration(obj)) return obj.toISOString()
  return obj
}

function main() {
  const dir = process.argv[2] || './samples'
  const filenames = fs.readdirSync(dir)
  const days = filenames
    .filter(filename => fs.lstatSync(path.join(dir, filename)).isFile())
    .map(filename => parse(
    filename,
    fs.readFileSync(path.join(dir, filename)).toString()
  ))
  console.log(JSON.stringify(days, null, 2))
}

main()
