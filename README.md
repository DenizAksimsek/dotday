# *.DAY &mdash; A human-readable calendar format #

One file == one day.

Designed for ease of parsing.

Here's a sample: 

```dotday
; 2020-07-13.day -- the filename is the date
; comment
; The title is optional.
13 July (Monday)
================

; Events are separated by blank lines
; !1h -> Your calendar app will remind you 1 hour before the event
10:00 -- 11.50 !1h
; First line is the title
MATH 102
; In order: Location, description, participants, rest of description
@ DB18
i hate this course
~ Mike Oxmall <mike.oxmall@example.edu>
so much
```

dotday-js/ includes a reference implementation that reads a directory of
.day files and outputs JSON data.

`format.textile` includes an informal description.

## TO DO ##

This is basically useless at this point. There is so much to do.

- [ ] Compile to iCalendar format
- [ ] Timezone handling
- [ ] Syntax highlighting
- [ ] Formal description

### Planned features ###

- [X] Attachments (URI or relative path)
- [X] Tags
- [ ] Colors
  * How will that work in plaintext?
- [ ] Timezone configuration
- [ ] Multiple days in one file
  * Possible syntax:
    ```dotday
    Day 1
    ==========
    2020-07-24

    Day 2
    ==========
    2020-07-25
    ```

## License ##

The reference implementation in the dotday-js directory is MIT
licensed.
