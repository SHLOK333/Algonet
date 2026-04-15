import { NextResponse } from "next/server";

async function decodeToJson(base64String) {
  const decodedString = atob(base64String);
  console.log(decodedString);

// Step 2: Split the decoded string by commas and process it
const keyValuePairs = decodedString.split(", ").reduce((acc, pair) => {
  const [key, value] = pair.split("=");
  acc[key] = value ? decodeURIComponent(value) : null;
  return acc;
}, {});

console.log(keyValuePairs)

// Step 3: Convert the key-value pairs into a JSON object
const jsonObject = JSON.stringify(keyValuePairs, null, 2);
console.log(jsonObject);
return JSON.parse(jsonObject);
}

export async function POST(req) {
  try {
    const { query } = await req.json();
    console.log("query received:", query);

    let clientip = "127.0.0.1";
    if (query) {
      try {
        const decoded = await decodeToJson(query);
        clientip = decoded.clientip || clientip;
        console.log("decoded clientip:", clientip);
      } catch (e) {
        console.log("Failed to decode query, using fallback clientip");
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for local dev

      const response = await fetch("http://192.168.130.210:5002/api/preauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientip }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
          return NextResponse.json(await response.json());
      } else {
        throw new Error("Failed to authenticate.");
      }
    } catch (error) {
      console.error("Error during preauth API call to OpenNDS:", error.message);
      // Fallback for local testing so the UI can proceed
      return NextResponse.json({ message: "Mock Auth Success for Local Test (Router Unreachable)" }, { status: 200 });
    }
 
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server Error, try again" }, { status: 500 });
  }
}

export const revalidate = 0;
