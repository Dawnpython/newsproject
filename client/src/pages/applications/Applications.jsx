
import { useNavigate,  } from "react-router-dom";
import {  useEffect,  } from "react";

export default function Application(){

    const navigate = useNavigate();


     useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) navigate("/account", { replace: true });
      }, [navigate]);

    return(
        <>
        <h1>Hello</h1>
        </>
    )
}