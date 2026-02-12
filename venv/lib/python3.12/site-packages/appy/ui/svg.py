'''Management of SVG icons'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Just like CSS and JS files, SVG images are loaded in RAM at Appy server
# startup. This is not just for performance reasons: it makes it possible to
# patch them when loaded.

# The SVG file may contain special markers of the form |<name>|. If <name>
# corresponds to one of the attributes of class SvgConfig below, it will be
# replaced with the attribute value of the SvgConfig instance as loaded in
# the global config, in config.ui.svg.

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Config:
    '''Configuration of SVG icons'''

    def __init__(self):
        # Color for the main elements in the SVG file
        self.mainColor = '#777777'
        # Color for element that must be drawn in a lighter color, made to be
        # visible on a dark as well as on a bright background.
        self.lightColor = '#cecece'
        # A more flashy color, for some specific elements
        self.flashyColor = '#939393'
        # An alternate showy color
        self.showyColor = '#abab4e'
        # Colors to apply so some (out)lines within the image
        self.drawColorA = '#c9c7c5'
        self.drawColorB = '#777777'
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
