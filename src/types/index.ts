export interface JoinRoomData {
  roomId: string
  username: string
}

export interface User {
  id: string
  username: string
  roomId: string
}

export type Message = {
  type: 'text' | 'notification'
  data: string
} & {
  id: string
  sender: User
  createdAt: string
}

export interface Messages {
  [key: string]: Message[]
}

export type MessagePayload = {
  type: 'text' | 'notification'
  data: string
} & {
  roomId: string
}
