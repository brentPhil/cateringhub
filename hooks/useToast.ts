import { toast } from "sonner";

const toastApi = {
  toast,
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};

export const useToast = () => toastApi;

export default useToast;
