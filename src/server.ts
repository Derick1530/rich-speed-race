import 'module-alias/register'

import express from 'express'
import { Server, type Socket } from 'socket.io'
import http from 'http'
import cors from 'cors'
import { z } from 'zod'

import type { JoinRoomData, Message, MessagePayload } from '@/types'
import { joinRoomSchema } from './lib/joinRoom'
import { addUser, getRoomMembers, getUser, removeUser } from './data/user'
import { v4 as uuidv4 } from 'uuid'
import { addMessage, getRoomMessages } from './data/message'

const app = express()

app.use(cors())

const server = http.createServer(app)
const now = new Date()

const io = new Server(server)

function isRoomCreated(roomId: string) {
  const rooms = [...io.sockets.adapter.rooms]
  return rooms?.some(room => room[0] === roomId)
}

function validateJoinRoomData(socket: Socket, joinRoomData: JoinRoomData) {
  try {
    return joinRoomSchema.parse(joinRoomData)
  } catch (error) {
    if (error instanceof z.ZodError) {
      socket.emit('invalid-data', {
        message: 'The entities you provided are not correct and cannot be processed.',
      })
    }
  }
}

function joinRoom(socket: Socket, roomId: string, username: string) {
  socket.join(roomId)
  const user = {
    id: socket.id,
    username,
  }
  addUser({ ...user, roomId })
  const members = getRoomMembers(roomId)

  socket.emit('room-joined', { user, roomId, members })
  socket.to(roomId).emit('update-members', members)
  socket.to(roomId).emit('send-notification', {
    title: 'New member arrived!',
    message: `${username} joined the party.`,
  })
}

function leaveRoom(socket: Socket) {
  const user = getUser(socket.id)
  if (!user) return

  const { username, roomId } = user

  removeUser(socket.id)
  const members = getRoomMembers(roomId)

  socket.to(roomId).emit('update-members', members)
  socket.to(roomId).emit('send-notification', {
    title: 'Member departure!',
    message: `${username} left the party.`,
  })
  socket.leave(roomId)
}

io.on('connection', socket => {
  socket.on('create-room', (joinRoomData: JoinRoomData) => {
    const validatedData = validateJoinRoomData(socket, joinRoomData)

    if (!validatedData) return
    const { roomId, username } = validatedData

    joinRoom(socket, roomId, username)
  })

  socket.on('join-room', (joinRoomData: JoinRoomData) => {
    const validatedData = validateJoinRoomData(socket, joinRoomData)

    if (!validatedData) return
    const { roomId, username } = validatedData

    if (isRoomCreated(roomId)) {
      return joinRoom(socket, roomId, username)
    }

    socket.emit('room-not-found', {
      message: "Oops! The Room ID you entered doesn't exist or hasn't been created yet.",
    })
  })

  socket.on('send-message', ({ roomId, data, type }: MessagePayload) => {
    const sender = getUser(socket.id)
    if (!sender) return

    const messageObj = {
      id: uuidv4(),
      type,
      sender,
      data,
      createdAt: now,
    } as Message

    addMessage(messageObj, roomId)
    io.to(roomId).emit('receive-message', messageObj)
  })


  socket.on('leave-room', () => {
    leaveRoom(socket)
  })

  socket.on('disconnect', () => {
    socket.emit('disconnected')
    leaveRoom(socket)
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => console.log(`Server is running on port ${PORT} now!`))
