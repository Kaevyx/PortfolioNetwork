/**
 * Simple toast notification utility
 */

export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll(".toast-notification");
  existingToasts.forEach((toast) => toast.remove());

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast-notification fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-fade-in max-w-md ${
    type === "success" 
      ? "bg-green-500 text-white" 
      : type === "error" 
      ? "bg-red-500 text-white" 
      : "bg-blue-500 text-white"
  }`;
  
  toast.innerHTML = `
    <div class="flex items-start gap-2">
      <div class="flex-1">
        <p class="font-medium">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-white/80 hover:text-white">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

