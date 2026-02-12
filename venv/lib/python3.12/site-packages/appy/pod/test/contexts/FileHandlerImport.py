import os.path
import appy

def getFileHandler():
    return open('%s/pod/test/templates/NoPython.odt' % os.path.dirname(appy.__file__))

