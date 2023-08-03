import type { Message, Messages } from '@/types'
const messages: Messages = {}

const getRoomMessages = (roomId: string, userId: string) => {
  return messages[roomId]?.filter(message => {
    // All messages with type 'text' and 'image' are returned
    if (message.type === 'text') return true
    // Only 'notification' messages that does not match with userId are returned
    return message.sender?.id !== userId
  })
}

const addMessage = (message: Message, roomId: string) => {
  if (messages[roomId]) {
    messages[roomId].push(message)
  } else {
    messages[roomId] = [message]
  }
}

const deleteRoom = (roomId: string) => delete messages[roomId]

export { getRoomMessages, addMessage, deleteRoom }
