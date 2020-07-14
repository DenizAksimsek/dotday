# *.DAY &mdash; A human-readable calendar format #

One file == one day.

Designed for ease of parsing.

Here's a sample: 

```dotday
; 2020-07-13.day
; comment
= 2020-07-13 =
; Monday

; Events are separated by blank lines
; !1h -> Your calendar app will remind you 1 hour before the event
10:00 -- 11.50 !1h
; First line is the title
MATH 102
; In order: Location, description, participants
@ DB18
i hate this course
so much
~ Mike Oxmall <mike.oxmall@example.edu>
```

dotday-js/ includes a Node.js based reference implementation that reads a directory of .day files and outputs iCalendar (.ics) data.

`format.textile` includes an informal description.

## TO DO ##

This is basically useless at this point. There is so much to do.

- [X] Compile to iCalendar format
- [ ] Timezone handling
- [ ] Syntax highlighting
- [ ] Formal description

### Planned features ###

- [X] Attachments (URI or relative path)
- [X] Tags
- [ ] Participants: format `John Doe <jdoe@example.com>`
- [ ] Colors
  * How will that work in plaintext?
- [ ] Timezone configuration
- [ ] Multiple days in one file

## License ##

The reference implementation in the dotday-js directory is MIT
licensed.
