// Get a cookie
export function goodTube_helper_getCookie(name: string): string | null {
  // Split the cookie string and get all individual name=value pairs in an array
  let cookies = document.cookie.split(";");

  // Loop through the array elements
  for (let i = 0; i < cookies.length; i++) {
    let cookieParts = cookies[i]?.split("=");

    // Use optional chaining and nullish coalescing to handle undefined safely
    let cookieName = cookieParts?.[0]?.trim() ?? "";
    let cookieValue = cookieParts?.[1] ?? "";

    // Compare the cookie name after ensuring it's not undefined
    if (name === cookieName) {
      // Decode the cookie value and return
      return decodeURIComponent(cookieValue);
    }
  }

  // Return null if not found
  return null;
}
