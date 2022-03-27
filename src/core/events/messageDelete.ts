import { Message, TextChannel } from 'discord.js'
import {
  addBlacklisted,
  addBlacklistNotice,
  findVidIdAndCulpritByMsgId,
  isBlacklisted,
} from '../db/functions'
import { VideoId } from '../../modules/holodex/frames'
import { createEmbed, send, ButtonRow } from '../../helpers/discord'
import { doNothing, log } from '../../helpers'
import { oneLine } from 'common-tags'
import { RelayedComment } from '../db/models/RelayedComment'

export function messageDelete(msg: Message): void {
  const [vidId, culprit] = findVidIdAndCulpritByMsgId(msg.guild, msg.id)
  const isNew = msg.guild && !isBlacklisted(culprit?.ytId, msg.guild!.id)
  const callback = culprit && isNew ? blacklistAndNotify : doNothing

  callback(msg, culprit!, vidId!)
}

//////////////////////////////////////////////////////////////////////////////

function blacklistAndNotify(msg: Message, culprit: RelayedComment, vidId: VideoId): void {
  const reason = 'Deleted by mod.'

  log(oneLine`
    A moderator blacklisted ${culprit.ytId} by deleting their TL
    in server ${msg.guild!.name} (${msg.guild!.id})
  `)

  addBlacklisted(msg.guild!, {
    ytId: culprit!.ytId,
    name: culprit!.author,
    reason,
  })

  send(<TextChannel>msg.channel, {
    embeds: [
      createEmbed({
        fields: [
          {
            name: ':no_entry: Blacklisted channel',
            value: culprit.ytId,
            inline: true,
          },
          {
            name: ':clown: Current name',
            value: culprit.author,
            inline: true,
          },
          {
            name: ':bookmark_tabs: Reason',
            value: reason,
            inline: true,
          },
        ],
      }),
    ],
    components: [
      ButtonRow([
        { label: 'Cancel', customId: 'cancel', style: 2 },
        { label: "Cancel but don't log line", customId: 'cancel2', style: 2 },
        { label: "Clear author's TLs", customId: 'clear', style: 4 },
      ]),
    ],
  }).then((msg) =>
    addBlacklistNotice({
      g: msg?.guild!,
      msgId: msg?.id ?? '0',
      ytId: culprit!.ytId,
      videoId: vidId!,
      originalMsgId: culprit!.msgId!,
    }),
  )
}
