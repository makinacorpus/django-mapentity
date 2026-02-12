'''Management of database transactions'''

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import ZODB.POSException
from DateTime import DateTime
from ZODB import utils as zutils

from appy.px import Px

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
bn         = '\n'
UNDO_TRANS = ':: Undoed ::'

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class Transaction:
    '''Represents a database transaction'''

    # Some elements will be traversable
    traverse = {}

    def __init__(self, info):
        '''Initialise a Transaction object from this dict raw p_info about a
           transaction as produces by the ZODB.'''
        # Get the transaction ID, as a string (the ZODB defines it as bytes)
        self.id = info['id'].decode()
        # The login of the user having performed it
        self.login = info['user_name']
        # When what that transaction committed ?
        self.date = DateTime(info['time'])
        # Details about the transaction, as a string. In most cases, it
        # corresponds to the path of the corresponding Appy action, excepted
        # in some special cases, like the transaction performed at system
        # startup.
        self.details = info['description'] or '-'

    def getDate(self, tool):
        '''Return p_self.date, formatted'''
        return tool.formatDate(self.date)

    def asText(self, tool):
        '''Returns p_self's data as a single line of text'''
        return f'<span class="transId">{self.id}</span> · ' \
               f'{self.getDate(tool)} · By {self.login} · {self.details}'

    #- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    #                            Class methods
    #- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    @classmethod
    def list(class_, database, first=0, count=20):
        '''Lists the slice of at most p_count database transactions starting at
           index p_first. The result is a list of Transaction objects.'''
        # p_first and p_count define a slice of transactions among all database
        # transactions. p_first is the index of the first transaction from the
        # slice (0 being the index of the most recent transaction). p_count is
        # the number of transactions that will be retrieved.
        db = database.db
        return [Transaction(info) for info in db.undoLog(first, -count)]

    @classmethod
    def get(class_, database, index):
        '''Gets the transaction (as a Transaction object) having this p_index'''
        info = database.db.undoLog(index, -1)[0]
        return Transaction(info)

    @classmethod
    def getUndoDetails(class_, tool, indexes):
        '''Return textual, human-readable details about transactions having
           these p_indexes, as a html "ul" tag.'''
        # Retrieve info about every transaction whose ID is in p_ids
        infos = []
        database = tool.database
        for i in indexes:
            trans = Transaction.get(database, i)
            infos.append(f'<li>{trans.asText(tool)}</li>')
        return f'<ul>{bn.join(infos)}</ul>'

    traverse['undo'] = 'Manager'
    @classmethod
    def undo(class_, tool):
        '''(Tries to) undo one or more transactions whose IDs are in the
           request, as prepared by PX p_class_.view, in section named
           “Transactions”.'''
        # Get transaction IDs from the request. Every ID has the form:
        #
        #                   '<index>*<transaction_id>'
        #
        # index is the index of the transaction among all transactions in the
        # ZODB (0 being the most recent transaction); transaction_id is the
        # technical transaction ID as known by the ZODB, but as a unicode string
        # (and not bytes).
        ids = tool.req.transId
        if not ids:
            tool.goto(message=class_.UNDO_NIL)
            return
        # Ensure p_ids is a list
        if isinstance(ids, str):
            ids = [ids]
        # Extract transaction indexes and ids, and convert unicode-based ids to
        # bytes-ids, as required by the ZODB.
        indexes = []
        tids = []
        for id in ids:
            i, tid = id.split('*', 1)
            indexes.append(int(i))
            tids.append(tid.encode())
        # Try to perform the undo
        database = tool.database
        try:
            database.db.undoMultiple(tids)
            # Perform the commit now, instead of leaving Appy performing it at
            # the end of request handling (tool.H().commit = True). Indeed, it
            # is at commit time that an exception is raised if the undo is not
            # possible. Moreover, it let us create a custom commit description
            # that includes details about the undoed transaction(s).
            descr = f'{UNDO_TRANS}{class_.getUndoDetails(tool, indexes)}'
            database.commit(tool.H(), description=descr)
        except ZODB.POSException.MultipleUndoErrors as err:
            # Get details about the conflicting transaction
            details = zutils.tid_repr(err._reason)
            text = str(err)
            return tool.goto(message=class_.UNDO_KO % (text, details),
                             fleeting=False)
        except ZODB.POSException.POSKeyError as err:
            return tool.goto(message=class_.UNDO_TKO % (str(err)),
                             fleeting=False)
        # Redirect to the first page. That way, the undo transaction we just
        # performed can directly be consulted.
        tool.goto(f'{tool.url}/view?page=transactions', message=class_.UNDO_OK,
                  fleeting=False)

    #- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    #                                 PXs
    #- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    # Confirm message when performing a transaction undo
    cr = '<br/><br/>'
    UNDO_CF = f'You are about to undo the selected transaction(s).{cr}' \
              f'Depending on the presence of earlier transactions impacting ' \
              f'common objects, the operation may fail.{cr}Proceed ?'
    UNDO_NIL = 'Please select at least one transaction to undo.'
    UNDO_OK  = '✌️ Undo successful !'
    UNDO_KO  = f'🚫️ Undo failed.{cr}Earlier transactions prevent to undo the '\
               f'selection.{cr}ZODB says: %s.{cr}Conflicting transaction: %s.'
    UNDO_TKO = f'🚫️ Undo failed. ZODB says: %s.'

    # Navigate within bunches of x transactions (last transactions first)

    pxNav = Px('''
     <div class="flexg">

      <!-- Goto first page -->
      <a if="first != 0" href=":pageUrl % 0">
       <img src=":svg('arrows')" class="iconS" style=":rotate % 90"/>
      </a>

      <!-- Goto previous page -->
      <a if="first != 0" href=":pageUrl % (first - batchSize)">
       <img src=":svg('arrow')" class="iconS" style=":rotate % 90"/>
      </a>

      <!-- Display current range -->
      <div if="not(first == 0 and counT &lt; batchSize)">
       <x>:first+1</x> ⇀ <x>:first + batchSize</x>
      </div>

      <!-- Goto next page -->
      <a if="counT == batchSize" href=":pageUrl % (first + batchSize)">
       <img src=":svg('arrow')" class="iconS" style=":rotate % 270"/>
      </a>
     </div>''')

    # Show a bunch of transactions

    pxList = Px('''
     <x var="database=tool.database;
             Transaction=database.Transaction;
             first=int(req.first) if 'first' in req else 0;
             batchSize=int(req.batchSize) if 'batchSize' in req else 20;
             transactions=Transaction.list(database, first, batchSize);
             counT=len(transactions);
             pageUrl=f'{tool.url}/view?page=transactions&amp;first=%s';
             rotate='transform:rotate(%ddeg)'">

      <h2>Transactions <span class="discreet"> · Most recent first</span></h2>

      <!-- Navigation -->
      <x>:Transaction.pxNav</x>

      <!-- Transactions -->
      <form if="transactions" method="post" id="undoTrans" name="undoTrans"
            action=":f'{tool.url}/Database/Transaction/undo'">
       <table class="small">
        <tr><th></th><th>ID</th><th>Time</th><th>By</th><th>Detail</th></tr>
        <tr for="trans in transactions"
            var2="tid=trans.id;
                  tindex=loop.trans.nb;
                  ntid=f'{first + tindex}*{tid}'">
         <td><input type="checkbox" name="transId"
                    id=":f'trans{tindex}'" value=":ntid"/></td>
         <td class="transId">:tid</td>
         <td>:trans.getDate(tool)</td>
         <td>:trans.login</td>
         <td>::trans.details</td>
        </tr>
       </table>
       <div class="flexg topSpace">
        <input type="button" value="Undo selected" class="button"
               onclick=":'askConfirm(%s,%s,%s)' % (q('form'), q('undoTrans'),
                                                   q(Transaction.UNDO_CF))"
               style=":svg('back', bg='18px 18px')"/>
       </div>
      </form>
      <div if="not transactions">No more transaction here.</div>
     </x>''',

     css='''
      .transId { font-family:monospace }
      .small td.transId { padding-top:0.3em }''')
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
