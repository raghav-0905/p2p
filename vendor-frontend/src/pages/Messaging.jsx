import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText } from "@mui/material";

export default function Messaging() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: v } = await supabase.from("vendors").select("*").eq("user_id", user.id).single();
    setVendor(v || null);
    if (!v) return;
    const { data } = await supabase
      .from("vendor_messages")
      .select("*")
      .eq("vendor_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!text.trim() || !vendor) return;
    await supabase.from("vendor_messages").insert([{
      vendor_user_id: vendor.user_id,
      org_id: vendor.org_id,
      sender_type: "vendor",
      message: text.trim(),
    }]);
    setText("");
    fetchMessages();
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} mb={1}>Communication / Messaging</Typography>
      <Typography color="text.secondary" mb={3}>Raise queries and disputes with buyer teams.</Typography>
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: 2.5 }}>
        <Box display="flex" gap={1} mb={2}>
          <TextField fullWidth placeholder="Write a message about PO or invoice..." value={text} onChange={(e) => setText(e.target.value)} />
          <Button variant="contained" onClick={sendMessage}>Send</Button>
        </Box>
        <List>
          {messages.map((m) => (
            <ListItem key={m.id} divider>
              <ListItemText primary={m.message} secondary={new Date(m.created_at).toLocaleString()} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
