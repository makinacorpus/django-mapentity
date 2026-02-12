#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
from DateTime import DateTime
from persistent import Persistent
from BTrees.IOBTree import IOBTree
from persistent.list import PersistentList

from .views import View
from appy.ui.criteria import Criteria
from appy.utils import dates as dutils
from appy.model.fields.calendar.data import EventData

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
E_DATA_KO   = 'Object passed in the "data" parameter must be an instance of ' \
              'appy.model.fields.calendar.data.EventData, or a sub-class of it.'
E_MODE_KO   = 'A timeslot or an end date is required. Both are missing.'
E_SPAN_KO   = 'Spreading an event on several days with a eventSpan is only ' \
              'possible when creating an event in a timeslot.'
TSLOT_USED  = 'An event is already defined at this timeslot.'
DAY_FULL    = 'No more place for adding this event.'
UNSORT_EVTS = 'Events must be sorted if you want to get spanned events to be ' \
              'grouped.'
FROM_RQ_RNS = 'Render mode "%s" not known or not supported yet.'
EVT_ED      = '%s updated in slot %s.'
EVT_DEL     = '%s deleted (%d)%s.'
EVT_DEL_SL  = '%s deleted at slot %s.'

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Factory:
    '''Factory for creating events'''

    def __init__(self, o, field, date, eventType, timeslot='main',
                 eventSpan=None, log=True, say=True, deleteFirst=False,
                 end=None, comment=None, data=None):
        # The object on which calendar data is manipulated
        self.o = o
        # The Calendar field
        self.field = field
        # The day at which the event must be created
        self.date = date
        # The type of the event to create. May come from the request.
        req = o.req
        self.eventType = eventType or req.eventType
        # The timeslot that will host the event, for a slotted event
        self.timeslot = timeslot
        # This will hold the Timeslot Objects as defined on p_field, if
        # relevant, as a dict keyed by their ID.
        self.timeslots = None
        # Is the event to created "slotted" ?
        self.slotted = timeslot is not None
        # [Slotted events only] The number of subsequent days the event must be
        #                       duplicated on.
        self.eventSpan = eventSpan
        # Must we log the operation ?
        self.log = log
        # Must we return a message to the UI ?
        self.say = say
        # Must existing events be deleted prior to creating the new one(s) ?
        self.deleteFirst = deleteFirst
        # [Unslotted events only] The end date and hour, as a DateTime object
        self.end = end
        # An optional comment, in XHTML format
        self.comment = comment
        # Optional custom event data
        self.data = data
        # Get the persistent list of events stored at this p_date on p_o. Create
        # it if it does not exist yet.
        self.events = Event.getList(o, field, date)

    def mergeSlotted(self, events):
        '''If, after adding an event of p_eventType, all timeslots are used with
           events of the same type, we can merge them and create a single event
           of this type in the main timeslot.'''
        # When defining an event in the main timeslot, no merge is needed
        timeslot = self.timeslot
        if timeslot == 'main' or not events: return
        # Merge is required if all events of this p_eventType reach together a
        # part of 1.0.
        count = 0.0
        o = self.o
        field = self.field
        eventType = self.eventType
        timeslots = self.timeslots
        for event in events:
            if event.eventType == eventType:
                count += event.getDayPart(o, field, timeslots)
        Timeslot = field.Timeslot
        dayPart = Timeslot.get(timeslot, o, field, timeslots).dayPart or 0
        if (count + dayPart) == 1.0:
            # Delete all events of this type and create a single event of this
            # type, with timeslot "main". If a comment or custom data was stored
            # on these events, it will be lost.
            i = len(events) - 1
            while i >= 0:
                if events[i].eventType == eventType:
                    del events[i]
                i -= 1
            events.insert(0, Event(eventType, comment=self.comment,
                                   data=self.data))
            return True

    def checkSlotted(self):
        '''Checks if one may create an event of p_self.eventType in this
           p_self.timeslot. Events already defined at the current date are in
           p_self.events. If the creation is not possible, an error message is
           returned.'''
        # The following errors should not occur if we have a normal user behind
        # the ui.
        events = self.events
        timeslot = self.timeslot
        for e in events:
            if e.timeslot == timeslot: return TSLOT_USED
            elif e.timeslot == 'main': return DAY_FULL
        if events and timeslot == 'main': return DAY_FULL
        # Get the Timeslot and check if, at this timeslot, it is allowed to
        # create an event of p_eventType.
        slot = self.timeslots.get(timeslot)
        if slot and not slot.allows(self.eventType):
            _ = self.o.translate
            return _('timeslot_misfit', mapping={'slot': slot.getName()})

    def makeSlotted(self, date, events, handleEventSpan):
        '''Create a slotted event in calendar p_self.field. Manage potential
           merging of events and creation of a sequence of events spanned on
           several subsequent days.'''
        # In the case of an event spanned on several subsequent days, when
        # m_makeSlotted will be called recursively for creating the events on
        # these subsequent days, it will be called with p_handleEventSpan being
        # False to avoid infinite recursion.
        timeslot = self.timeslot
        eventType = self.eventType
        event = None
        # Merge this event with others when relevant
        merged = self.mergeSlotted(events)
        if not merged:
            # Create and store the event
            event = Event(eventType, timeslot=timeslot, comment=self.comment,
                          data=self.data)
            events.append(event)
            # Sort events in the order of timeslots
            if len(events) > 1:
                timeslots = list(self.timeslots)
                events.sort(key=lambda e: timeslots.index(e.timeslot))
        # Span the event on the successive days if required
        suffix = ''
        eventSpan = self.eventSpan
        if handleEventSpan and eventSpan:
            for i in range(eventSpan):
                nextDate = date + (i+1)
                nextEvents = Event.getList(self.o, self.field, nextDate)
                self.makeSlotted(nextDate, nextEvents, False)
                suffix = f', span+{eventSpan}'
        if handleEventSpan and self.log:
            msg = f'added {eventType}, slot {timeslot}{suffix}'
            self.field.log(self.o, msg, self.date)
        return event

    def makeUnslotted(self):
        '''Create an unslotted event'''
        eventType = self.eventType
        event = Event(eventType, timeslot=None, start=self.date, end=self.end,
                      comment=self.comment, data=self.data)
        events = self.events
        events.append(event)
        if len(events) > 1:
            # Sort events according to their start date
            events.sort(key=lambda e: e.start)
        if self.log:
            start = self.date
            starT = start.strftime('%H:%M')
            end = self.end
            fmt = '%H:%M' if end.day() == start.day() else '%Y/%m/%d@%H:%M'
            enD = end.strftime(fmt)
            msg = f'added {eventType}, [{starT} → {enD}]'
            self.field.log(self.o, msg, start)
        return event

    def make(self, handleEventSpan=True):
        '''Create an event'''
        # Delete any event if required
        if self.events and self.deleteFirst:
            del self.events[:]
        # Return an error if the creation of a slotted event cannot occur
        if self.slotted:
            self.timeslots = self.field.Timeslot.getAll(self.o, self.field)
            error = self.checkSlotted()
            if error: return error
            # Create a slotted event. Manage potential merging and duplication.
            event = self.makeSlotted(self.date, self.events, handleEventSpan)
        else:
            # Create an unslotted event
            event = self.makeUnslotted()
        # Complete event data, if it exists
        if self.data: self.data.complete(self.o, event)
        # Call a custom method if defined
        method = self.field.afterCreate
        if method: method(self.o, self.date, self.eventType, self.timeslot,
                          self.eventSpan or 0)
        if self.say:
            o = self.o
            o.say(o.translate('object_saved'), fleeting=False)

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Event(Persistent):
    '''A calendar event as will be stored in the database'''

    def __init__(self, eventType, timeslot='main', start=None, end=None,
                 comment=None, data=None):
        # The event type, as a string, selected from possible values as defined
        # in attribute Calendar::eventTypes.
        self.eventType = eventType
        # The event timeslot, if the event is "slotted" = if it is to be
        # injected in one of the standard timeslots as defined on the tied
        # Calendar field, in attribute named "timeslots".
        self.timeslot = timeslot
        # The event start and end dates+hours, as DateTime objects, for
        # "unslotted" events defining their own specific schedule.
        self.start = start
        self.end = end
        # An optional comment, in XHTML format, encodable if attribute
        # Calendar.useEventComments is True.
        self.comment = comment
        # Additional, custom data that can be injected in the event, as an
        # instance of class appy.model.fields.calendar.data.EventData, or a
        # custom sub-class.
        self.data = data

    def getName(self, o, field, timeslots, typeInfo=None, xhtml=True,
                mode='Month'):
        '''Gets the name for this event, that depends on its type or data and
           may include the timeslot or schedule info.'''
        # The name is based on the event type, excepted when custom data is here
        # and p_xhtml must be rendered. In this latter case, a lot more info can
        # be dumped, and not only a "name".
        data = getattr(self, 'data', None)
        if data and xhtml:
            r, baseData = data.render(o, mode)
        else:
            # If we have the translated names for event types, use it
            r = baseData = None
            if typeInfo:
                if self.eventType in typeInfo:
                    r = typeInfo[self.eventType].name
                else:
                    # This can be an old deactivated event not precomputed
                    # anymore in p_typeInfo. Try to use field.getEventName
                    # to compute it.
                    try:
                        r = field.getEventName(o, self.eventType)
                    except Exception:
                        pass
        # If no name was found, use the raw event type
        r = r or self.eventType
        # Define a prefix, based on the start hour or timeslot
        timeslot = self.timeslot
        if timeslot == 'main':
            # No prefix to set: the event spans the entire day
            prefix = ''
        elif timeslot:
            slotId = self.timeslot
            # Add the timeslot as prefix
            slot = timeslots.get(slotId) if timeslots else None
            if slot:
                prefix = slot.getName(withCode=True)
            else:
                prefix = slotId
        else:
            # An unslotted event: add the start hour as prefix
            prefix = self.start.strftime('%H:%M')
        if prefix:
            # Format the prefix and add it to the result
            if xhtml:
                prefix = f'<div class="calSlot discreet">{prefix}</div>'
            else:
                prefix = f'{prefix} · '
        # Complete the v_prefix with base data when available
        if baseData: prefix = f'{prefix}{baseData}'
        # Finally, add the event comment if found
        if xhtml:
            comment = getattr(self, 'comment', None)
            if comment:
                r = f'{r}<div class="evtCom">{comment}</div>'
        return f'{prefix}{r}'

    def sameAs(self, other):
        '''Is p_self the same as p_other?'''
        return self.eventType == other.eventType and \
               self.timeslot == other.timeslot

    def getDayPart(self, o, field, timeslots=None):
        '''What is the day part taken by this event ?'''
        id = self.timeslot
        if id == 'main': return 1.0
        # Get the dayPart attribute as defined on the Timeslot object
        return field.Timeslot.get(self.timeslot, o, field, timeslots).dayPart

    def getTimeMark(self):
        '''Returns short info about the event time: the timeslot for a slotted
           event, or the start date else.'''
        return self.timeslot or self.start.strftime('%H:%M')

    def matchesType(self, type):
        '''Is p_self an event of this p_type ?'''
        # p_type can be:
        # - a single event type (as a string),
        # - a prefix denoting several event types (as a string ending with a *),
        # - a list of (unstarred) event types.
        etype = self.eventType
        if isinstance(type, str):
            if type.endswith('*'):
                r = etype.startswith(type[:-1])
            else:
                r = etype == type
        else:
            r = etype in type
        return r

    def __repr__(self):
        '''p_self's short string representation'''
        if self.timeslot:
            suffix = f'@slot {self.timeslot}'
        else:
            suffix = f'@{self.start.strftime("%H:%M")}'
        return f'‹Event {self.eventType} {suffix}›'

    #- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    #                              Class methods
    #- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    @classmethod
    def get(class_, o, field, eventType=None, minDate=None, maxDate=None,
            sorted=True, groupSpanned=False, slots=None):
        '''Returns all the events stored in this calendar p_field on this
           p_o(bject), of a given p_eventType if passed.'''

        # If p_eventType is None, it returns events of all types. p_eventType
        # can also be a list or tuple. The return value is a list of 2-tuples
        # whose 1st elem is a DateTime object and whose 2nd elem is the event.

        # If p_sorted is True, the list is sorted in chronological order. Else,
        # the order is random, but the result is computed faster.

        # If p_minDate and/or p_maxDate is/are specified (as DateTime objects),
        # it restricts the search interval accordingly. The precision for these
        # dates is the day (the potentially defined hour part is not taken into
        # account).

        # If p_groupSpanned is True, events spanned on several days are grouped
        # into a single event. In this case, tuples in the result are 3-tuples:
        # (DateTime_startDate, DateTime_endDate, event).

        # If p_slots is passed (as a list or tuple of timeslots), only events
        # defined at one of these slots will be returned.

        # Prevent wrong combinations of parameters
        if groupSpanned and not sorted:
            raise Exception(UNSORT_EVTS)
        r = []
        if field.name not in o.values: return r
        # Compute "min" and "max" tuples
        if minDate:
            minYear = minDate.year()
            minMonth = (minYear, minDate.month())
            minDay = (minYear, minDate.month(), minDate.day())
        if maxDate:
            maxYear = maxDate.year()
            maxMonth = (maxYear, maxDate.month())
            maxDay = (maxYear, maxDate.month(), maxDate.day())
        # Browse years
        years = getattr(o, field.name)
        for year in years.keys():
            # Don't take this year into account if outside interval
            if minDate and year < minYear: continue
            if maxDate and year > maxYear: continue
            months = years[year]
            # Browse this year's months
            for month in months.keys():
                # Don't take this month into account if outside interval
                thisMonth = (year, month)
                if minDate and thisMonth < minMonth: continue
                if maxDate and thisMonth > maxMonth: continue
                days = months[month]
                # Browse this month's days
                for day in days.keys():
                    # Don't take this day into account if outside interval
                    thisDay = (year, month, day)
                    if minDate and thisDay < minDay: continue
                    if maxDate and thisDay > maxDay: continue
                    events = days[day]
                    # Browse this day's events
                    for event in events:
                        # Filter unwanted events
                        if eventType and not event.matchesType(eventType):
                            continue
                        if slots and event.timeslot not in slots:
                            continue
                        # We have found a event
                        date = DateTime(f'{year}/{month}/{day} UTC')
                        if groupSpanned:
                            singleRes = [date, None, event]
                        else:
                            singleRes = (date, event)
                        r.append(singleRes)
        # Sort the result if required
        if sorted: r.sort(key=lambda x: x[0])
        # Group events spanned on several days if required
        if groupSpanned:
            # Browse events in reverse order and merge them when appropriate
            i = len(r) - 1
            while i > 0:
                currentDate = r[i][0]
                lastDate = r[i][1]
                previousDate = r[i-1][0]
                currentType = r[i][2].eventType
                previousType = r[i-1][2].eventType
                if (previousDate == (currentDate-1)) and \
                   (previousType == currentType):
                    # A merge is needed
                    del r[i]
                    r[i-1][1] = lastDate or currentDate
                i -= 1
        return r

    @classmethod
    def getList(class_, o, field, date):
        '''Gets the persistent list of events defined on this p_o(bject) for
           this calendar p_field at thid p_date. If it does not exist, it is
           created.'''
        # Split the p_date into separate parts
        year, month, day = date.year(), date.month(), date.day()
        # Create, on p_o, the calendar data structure if it doesn't exist yet
        name = field.name
        yearsDict = o.values.get(name)
        if yearsDict is None:
            # 1st level: create a IOBTree whose keys are years
            yearsDict = IOBTree()
            setattr(o, name, yearsDict)
        # Get the sub-dict storing months for a given year
        if year in yearsDict:
            monthsDict = yearsDict[year]
        else:
            yearsDict[year] = monthsDict = IOBTree()
        # Get the sub-dict storing days of a given month
        if month in monthsDict:
            daysDict = monthsDict[month]
        else:
            monthsDict[month] = daysDict = IOBTree()
        # Get the list of events for a given day
        if day in daysDict:
            events = daysDict[day]
        else:
            daysDict[day] = events = PersistentList()
        return events

    @classmethod
    def create(class_, o, field, date, eventType, timeslot='main',
               eventSpan=None, log=True, say=True, deleteFirst=False, end=None,
               comment=None, data=None):
        '''Create a new event of some p_eventType in this calendar p_field on
           p_o, at some p_date (day), being a DateTime object.'''

        # 2 different kinds of events can be created: events to "inject" in some
        # predefined p_timeslot, or "free-style" events, defining their own
        # specific schedule (start and end date/hour).

        # For creating an event in a timeslot, the p_timeslot identifier must be
        # defined. In that mode only, if an p_eventSpan is defined, the same
        # event will be duplicated in the p_eventSpan days following p_date.

        # For creating an own-scheduled event, set p_timeslot to None. p_date
        # must hold the event's own start date and hour; p_end must be passed
        # and hold the event's end date and hour, as a hour-aware DateTime
        # object.

        # In any mode, if p_deleteFirst is True, any existing event found at
        # p_date will be deleted before creating the new event.

        # In any mode, a custom EventData object can be passed in p_data. When
        # creating multiple events due to p_eventSpan, p_data is only associated
        # to the first created event.

        # Ensure parameters' correctness
        slotted = end is None
        if timeslot is None and slotted:
            raise Exception(E_MODE_KO)
        if not slotted and eventSpan is not None:
            raise Exception(E_SPAN_KO)
        if data is not None and not isinstance(data, EventData):
            raise Exception(E_DATA_KO)

        # Delegate the event creation to a factory
        factory = Factory(o, field, date, eventType, timeslot, eventSpan, log,
                          say, deleteFirst, end, comment, data)
        return factory.make(handleEventSpan=True)

    @classmethod
    def update(class_, o, field, date, timeslot, eventType, comment=None,
               log=True, say=True):
        '''Updates the event being currently defined on this p_o(bject) in this
           calendar p_field, at this p_date and p_timeslot: set a new
           p_eventType and/or p_comment.'''
        # Get the events being defined at this p_date
        events = field.getEventsAt(o, date)
        if not events: return
        # Find the event at this p_timeslot
        for event in events:
            if event.timeslot == timeslot:
                # The event has been found: update it
                event.eventType = eventType
                if field.useEventComments:
                    event.comment = comment
                if log:
                    eventName = event.getName(o, field, None, xhtml=False)
                    field.log(o, EVT_ED % (eventName, timeslot), date)
                if say:
                    o.say(o.translate('object_saved'), fleeting=False)
                return

    @classmethod
    def delete(class_, o, field, date, timeslot, handleEventSpan=True, log=True,
               say=True, executeMethods=True):
        '''Deletes the event being currently defined on this p_o(bject) in this
           calendar p_field, at this p_date and p_timeslot.'''
        # If p_timeslot is "*", it deletes all events at p_date, be there a
        # single event on the main timeslot or several events on other
        # timeslots. Else, it only deletes the event at this p_timeslot. If
        # p_handleEventSpan is True, p_o.req.deleteNext will be used to delete
        # successive events, too. Returns the number of deleted events.
        events = field.getEventsAt(o, date)
        if not events: return 0
        # Execute "beforeDelete"
        if executeMethods and field.beforeDelete:
            ok = field.beforeDelete(o, date, timeslot)
            # Abort event deletion when required
            if ok is False: return 0
        daysDict = getattr(o, field.name)[date.year()][date.month()]
        count = len(events)
        if timeslot == '*':
            # Delete all events at this p_date, and possible at subsequent days,
            # too, of p_handleEventSpan is True. Remember their v_eNames.
            eNames = ', '.join([e.getName(o, field, None, xhtml=False) \
                                for e in events])
            r = count
            del daysDict[date.day()]
            req = o.req
            suffix = ''
            if handleEventSpan and req.deleteNext == 'True':
                # Delete similar events spanning the next days when relevant
                nbOfDays = 0
                while True:
                    date += 1
                    if field.hasEventsAt(o, date, events):
                        r += class_.delete(o, field, date, timeslot, say=False,
                                    handleEventSpan=False, executeMethods=False)
                        nbOfDays += 1
                    else:
                        break
                if nbOfDays: suffix = f', span+{nbOfDays}'
            if log:
                msg = EVT_DEL % (eNames, count, suffix)
                field.log(o, msg, date)
        else:
            # Delete the event at p_timeslot
            r = 1
            i = len(events) - 1
            while i >= 0:
                if events[i].timeslot == timeslot:
                    name = events[i].getName(o, field, None, xhtml=False)
                    msg = EVT_DEL_SL % (name, timeslot)
                    del events[i]
                    if log: field.log(o, msg, date)
                    break
                i -= 1
        if say:
            o.say(o.translate('object_deleted'), fleeting=False)
        return r

    @classmethod
    def deleteMany(class_, o, field, start, end, timeslot, handleEventSpan=True,
                   log=True, say=True, executeMethods=True):
        '''Calls p_class_.delete to delete, in this calendar p_field on this
           p_o(bject), all events between these p_start & p_end dates (DateTime
           objects), transmitting all other parameters to p_class_.delete.
           Returns the number of deleted events.'''
        r = 0
        for day in dutils.DayIterator(start, end):
            r += class_.delete(o, field, day, timeslot,
                               handleEventSpan=handleEventSpan, log=log,
                               say=say, executeMethods=executeMethods)
        return r

    @classmethod
    def getFromRequest(class_, o, name, params):
        '''Retrieve events from the calendar field having this p_name, on this
           p_o(bject), from these p_param(eter)s coming from the request.'''
        cal = o.getField(name)
        params = Criteria.evaluate(params)
        # Get the corresponding View object: it will be used to determine the
        # timespan of interest as well as applying potential filters. Patch the
        # request for correctly feeding the view.
        req = o.req
        for name, value in params.items():
            req[name] = value
        view = View.get(o, cal)
        r = []
        r = cal.Event.get(o, cal, minDate=view.getGridEdge(True),
                                  maxDate=view.getGridEdge(False))
        if view.filterValues:
            # Apply filters
            r = [info for info in r if view.unfiltered(info[1])]
        return r
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
