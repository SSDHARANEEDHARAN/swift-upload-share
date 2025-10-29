import { FileUpload } from "@/components/FileUpload";

const Upload = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-[hsl(252,100%,97%)] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-[hsl(280,85%,65%)] bg-clip-text text-transparent">
          File Transfer
        </h1>
        <p className="text-lg text-muted-foreground">
          Share files quickly and securely
        </p>
      </div>
      <FileUpload />
    </div>
  );
};

export default Upload;
