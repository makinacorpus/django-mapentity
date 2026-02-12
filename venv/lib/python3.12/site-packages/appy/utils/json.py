#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
UNREADABLE = 'Unreadable JSON string: %s'

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from . import sequenceTypes
from .string import Normalize
from ..model.utils import Object as O

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Decoder:
    '''Converts JSON data into Python data structures'''

    # Boolean and None values are different in JSON and Python
    context = {'true': True, 'false': False, 'null': None}
    

    @classmethod
    def convertDict(class_, d):
        '''Returns a appy.Object instance representing dict p_d'''
        r = O()
        for name, value in d.items():
            # Ensure "name" will be a valid attribute name for a Python object
            n = Normalize.alphanum(name, keepUnderscore=True)
            setattr(r, n, class_.convertValue(value))
        return r

    @classmethod
    def convertList(class_, l):
        '''Every item being a dict in p_l is converted to an object'''
        i = len(l) - 1
        while i >= 0:
            l[i] = class_.convertValue(l[i])
            i -= 1

    @classmethod
    def convertValue(class_, val):
        '''Converts a JSON p_val into a Python value'''
        if isinstance(val, list):
            class_.convertList(val)
            r = val
        elif isinstance(val, dict):
            r = class_.convertDict(val)
        else:
            # In all other cases, no conversion is needed
            r = val
        return r

    @classmethod
    def decode(class_, jsonData):
        '''Converts JSON data received in a string (p_jsonData) to a Python data
           structure. JSON dicts are converted to Python objects.'''
        # Return None if there is p_jsonData is empty
        jsonData = jsonData.strip()
        if not jsonData: return
        try:
            return class_.convertValue(eval(jsonData, class_.context))
        except SyntaxError as err:
            # The presence of char "\r" may pose problem
            jsonData = jsonData.replace('\r', '')
            try:
                return class_.convertValue(eval(jsonData, class_.context))
            except SyntaxError as err:
                raise SyntaxError(UNREADABLE % jsonData)

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Encoder:
    '''Converts Python data structures to JSON'''

    def __init__(self, d):
        # The Python object or dict to encode
        self.d = d.__dict__ if hasattr(d, '__dict__') else d
        # The result, as a list of string tokens
        self.r = []

    def encodeString(self, s):
        '''Encodes this p_s(tring)'''
        # The JSON standard requires strings to be surrounded by double quotes,
        # not single quotes.
        self.r.append(f'"{s}"')

    def encodeList(self, l):
        '''Encodes list or tuple p_l as a JSON string'''
        r = self.r
        r.append('[')
        i = -1
        last = len(l) - 1 # Index of the last item in p_d
        for e in l:
            i += 1
            # Encode v_elem
            self.encodeValue(e)
            if i < last:
                r.append(',')
        r.append(']')
        return r

    def encodeDict(self, d):
        '''Encodes dict p_d as a JSON string'''
        # Browse items in p_d
        r = self.r
        r.append('{')
        i = -1
        last = len(d) - 1 # Index of the last item in p_d
        for k, v in d.items():
            i += 1
            # Encode the key and value
            self.encodeString(k)
            r.append(':')
            self.encodeValue(v)
            if i < last:
                r.append(',')
        r.append('}')

    def encodeValue(self, v):
        '''Encodes this Python p_v(alue) into its JSON equivalent and add it
           into p_self.r.'''
        if isinstance(v, str):
            self.encodeString(v)
        elif isinstance(v, dict):
            self.encodeDict(v)
        elif isinstance(v, sequenceTypes):
            self.encodeList(v)
        else:
            r = self.r
            if isinstance(v, bool):
                r.append(str(v).lower())
            else:
                # Perform a simple string conversion
                r.append(str(r))

    def encode(self):
        '''Encode the root dict p_self.d'''
        self.encodeDict(self.d)
        return ''.join(self.r)
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
