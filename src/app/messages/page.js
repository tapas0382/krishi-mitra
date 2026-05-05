'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navbar';
import { useSearchParams } from 'next/navigation';

export default function Inbox() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  // 1. Initial Load: Fetch the user and their contacts
  useEffect(() => {
    const storedUser = localStorage.getItem('krishiUser');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      fetchContacts(parsed.id);
    }
  }, [router]);

// 2. Chat Selection: Wait for contacts to finish loading, then find/create the chat
  useEffect(() => {
    // Wait until we have an ID from the URL. Also wait until contacts have finished loading!
    if (!targetUserId || loading) return; 

    // THE OMNI-SEARCH: Now this runs even if the user has 0 previous contacts
    const existingContact = contacts.find(c => {
      const possibleIds = [
        c._id, c.id, c.userId, c.user?._id, c.participant?._id,
        ...(Array.isArray(c.participants) ? c.participants.map(p => p._id || p) : []),
        ...(Array.isArray(c.members) ? c.members.map(m => m._id || m) : [])
      ];
      return possibleIds.some(id => id && String(id) === String(targetUserId));
    });

    if (existingContact) {
      // SUCCESS: We found the hidden ID in your sidebar list!
      setSelectedContact(existingContact);
    } else {
      // SUCCESS: They are NOT in the list. Create the temporary chat using 'id'.
      setSelectedContact({ 
        id: targetUserId, 
        name: searchParams.get('name') || "Farmer", // Grabs the name from your new Link!
        isTemporary: true
      }); 
    }
  }, [targetUserId, contacts, loading, searchParams]); // Added loading & searchParams as dependencies

  // 2. Fetch Contacts (Derived from Bookings AND Message History)
  const fetchContacts = async (userId) => {
    setLoading(true);
    try {
      // Notice we added a THIRD fetch here to get chat history!
      const [incomingRes, outgoingRes, messagesRes] = await Promise.all([
        fetch(`/api/bookings?userId=${userId}&role=owner`),
        fetch(`/api/bookings?userId=${userId}&role=renter`),
        fetch(`/api/messages?userId=${userId}`) // <-- THE NEW FIX
      ]);
      
      const inData = await incomingRes.json();
      const outData = await outgoingRes.json();
      const msgData = await messagesRes.json(); 

      const uniqueContacts = new Map();

      // 1. Add people from previous Chats (This fixes your bug!)
      if (msgData.success && msgData.data) {
        msgData.data.forEach(contact => {
          uniqueContacts.set(String(contact.id), { id: contact.id, name: contact.name });
        });
      }

      // 2. Add renters from Bookings
      if (inData.success && inData.data) {
        inData.data.forEach(booking => {
          if (booking.renter && booking.renter._id !== userId) {
            uniqueContacts.set(String(booking.renter._id), { id: booking.renter._id, name: booking.renter.name });
          }
        });
      }

      // 3. Add owners from Bookings
      if (outData.success && outData.data) {
        outData.data.forEach(booking => {
          if (booking.owner && booking.owner._id !== userId) {
            uniqueContacts.set(String(booking.owner._id), { id: booking.owner._id, name: booking.owner.name });
          }
        });
      }

      setContacts(Array.from(uniqueContacts.values()));
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Messages for a specific contact
  const fetchMessages = async (contactId) => {
    if (!user || !contactId) return;
    try {
      const res = await fetch(`/api/messages?user1=${user.id}&user2=${contactId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Poll for new messages every 3 seconds when a chat is open
  useEffect(() => {
    let interval;
    if (selectedContact) {
      fetchMessages(selectedContact.id); // initial fetch
      interval = setInterval(() => fetchMessages(selectedContact.id), 3000); 
    }
    return () => clearInterval(interval);
  }, [selectedContact]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const messageText = newMessage;
    setNewMessage(''); // Clear input instantly for good UX

    // Optimistically add message to UI
    const tempMsg = {
      _id: Date.now().toString(),
      sender: { _id: user.id },
      content: messageText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: selectedContact.id,
          content: messageText
        })
      });
      // The polling interval will catch the real message on the next tick
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8 w-full flex-1 flex flex-col">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Messages</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex overflow-hidden min-h-[600px] max-h-[700px]">
          
          {/* Left Sidebar: Contacts List */}
          <div className="w-1/3 border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 bg-white">
              <h2 className="font-bold text-slate-800">Your Connections</h2>
            </div>
            
            {loading ? (
              <p className="p-6 text-center text-slate-500 text-sm">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <p className="p-6 text-center text-slate-500 text-sm">No connections yet. Book a tool to start chatting!</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {contacts.map(contact => (
                  <li key={contact.id}>
                    <button 
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full text-left p-4 hover:bg-slate-100 transition-colors flex items-center gap-3 ${selectedContact?.id === contact.id ? 'bg-green-50 border-l-4 border-green-600' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-lg">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{contact.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right Area: Chat Window */}
          <div className="w-2/3 flex flex-col bg-white">
            {selectedContact ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3 shadow-sm z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-slate-900">{selectedContact.name}</h3>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <p>No messages yet.</p>
                      <p className="text-sm">Send a message to discuss tool pickups and details.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender._id === user.id;
                      return (
                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-2xl ${isMe ? 'bg-green-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                            <p>{msg.content}</p>
                            <span className={`text-[10px] mt-1 block ${isMe ? 'text-green-200' : 'text-slate-400'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 bg-white border-t border-slate-200">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..." 
                      className="flex-1 p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-slate-900"
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                <span className="text-4xl mb-4">💬</span>
                <p className="text-lg font-medium">Select a conversation to start chatting</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}