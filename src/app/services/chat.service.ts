import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl = `${environment.apiUrl}/api/messages`;
  
  private chatDrawerOpen = new BehaviorSubject<boolean>(false);
  chatDrawerOpen$ = this.chatDrawerOpen.asObservable();
  
  private openSpecificChat = new Subject<{userId: number, userName: string}>();
  openSpecificChat$ = this.openSpecificChat.asObservable();
  
  private stompClient: Client | null = null;
  
  private incomingMessage = new Subject<any>();
  incomingMessage$ = this.incomingMessage.asObservable();

  constructor(private http: HttpClient) {}

  toggleChatDrawer(isOpen?: boolean) {
    this.chatDrawerOpen.next(isOpen !== undefined ? isOpen : !this.chatDrawerOpen.value);
  }

  openChatWith(userId: number, userName: string) {
    this.toggleChatDrawer(true); 
    setTimeout(() => {
      this.openSpecificChat.next({ userId, userName });
    }, 150); 
  }

  getConversations(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/conversations/${userId}`);
  }

  getMessageHistory(senderId: number, receiverId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/history?senderId=${senderId}&receiverId=${receiverId}`);
  }

  acceptConversation(conversationId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/conversations/${conversationId}/accept`, {});
  }

  connectWebSocket(userId: number) {
    if (this.stompClient && this.stompClient.active) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws-chat`) as any,
      reconnectDelay: 5000,
      onConnect: (frame) => {
        console.log('Connected to Chat WS');
        
        this.stompClient?.subscribe(`/topic/messages.${userId}`, (message) => {
          if (message.body) {
            this.incomingMessage.next(JSON.parse(message.body));
          }
        });
        
        this.stompClient?.publish({
          destination: "/app/chat.connect",
          body: JSON.stringify({ userId: userId })
        });
      }
    });

    this.stompClient.activate();
  }

  sendMessageWS(senderId: number, receiverId: number, content: string) {
    if (this.stompClient && this.stompClient.active) {
      const payload = { senderId, receiverId, content };
      this.stompClient.publish({
        destination: "/app/chat.send",
        body: JSON.stringify(payload)
      });
    }
  }

  markMessageAsReadWS(messageId: number, senderId: number) {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.publish({
        destination: "/app/chat.read",
        body: JSON.stringify({ messageId: messageId, receiverId: senderId })
      });
    }
  }

  disconnectWebSocket(userId: number) {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.publish({
        destination: "/app/chat.disconnect",
        body: JSON.stringify({ userId: userId })
      });
      this.stompClient.deactivate();
    }
  }
}