import {  useEffect, useState } from "react"


const VITE_WS_URL = import.meta.env.VITE_WS_URL;

const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(VITE_WS_URL);
        ws.onopen = () => {
            setSocket(ws);
        }

        ws.onclose = () => {
            setSocket(null);
        }

        return () => {
            ws.close();
        }
    }, [])

    return socket;  
}
export default useSocket;