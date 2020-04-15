# MIT Track and Field Wall of Shame Flashcard Generator
Every year, the MIT Track team has to learn the full names, event, and year of all ~110 teammates and coaches. To make sure this happens, the captains put together a slideshow of everyone's info that is provided for studying, and another secret slideshow with the information removed to test us on. Unfortunately, they don't provide a blank version of the slideshow, and quizlet charges you for uploading images, so my freshman year I wrote some python to convert everything to a HTML slideshow. Shockingly, it's less of a house of cards than I expected, and it's actually worked for the rest of the years too. You can find example input PDFs in `examples.tar.gz`.

You'll have to forgive the codeing style, from what I recall it was mostly hobbled together at 1am.

`convert.py` relies on `pdfminder.six`.
