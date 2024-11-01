"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import NextImage from "next/image";
import { Camera, Upload, Crop, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

const ImageProcessor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>(
    { width: 0, height: 0 },
  );
  const [crop, setCrop] = useState<CropArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [ocrText, setOcrText] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        setImageSize({ width, height });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setError("Please upload an image file");
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            setImageSize({
              width: img.width,
              height: img.height,
            });
          };
          img.src = e.target?.result as string;
          setImage(e.target?.result as string);
          setCrop({ x: 0, y: 0, width: 0, height: 0 });
          setError(null);
          setOcrText("");
          setResponse("");
        };
        reader.onerror = () => {
          setError("Error reading file");
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError("Error uploading file: " + err);
    }
  };

  // Mouse and Touch Handlers
  const handleStart = (x: number, y: number) => {
    setIsDragging(true);
    startPos.current = { x, y };
    setCrop({ x, y, width: 0, height: 0 });
  };

  const handleMove = (x: number, y: number) => {
    if (!isDragging) return;
    const width = x - startPos.current.x;
    const height = y - startPos.current.y;
    setCrop({
      x: width > 0 ? startPos.current.x : x,
      y: height > 0 ? startPos.current.y : y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      handleStart(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      handleMove(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      handleStart(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      handleMove(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  const getCroppedImage = (): string => {
    const canvas = document.createElement("canvas");
    if (!imageRef.current) return "";

    const img = imageRef.current.querySelector("img");
    if (!img) return "";

    const scaleX = imageSize.width / img.clientWidth;
    const scaleY = imageSize.height / img.clientHeight;

    canvas.width = crop.width * scaleX;
    canvas.height = crop.height * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const imageElement = new Image();
    imageElement.src = image as string;

    ctx.drawImage(
      imageElement,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width * scaleX,
      crop.height * scaleY,
    );

    canvas.style.display = "none";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    document.body.appendChild(canvas);

    return canvas.toDataURL("image/jpeg");
  };

  const performOCR = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Dynamically import Tesseract.js
      const Tesseract = (await import("tesseract.js")).default;
      const worker = await Tesseract.createWorker(["eng", "deu"]);

      const imageData = crop.width > 0 ? getCroppedImage() : image;
      if (!imageData) {
        console.error("No image data available");
        throw new Error("No image data available");
      }

      const {
        data: { text },
      } = await worker.recognize(imageData);

      setOcrText(text || "No text found");

      await worker.terminate();
    } catch (err) {
      setError(
        `Error performing OCR: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const callChatGPT = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: ocrText }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      setResponse(data.response);
    } catch (err) {
      setError(
        `Error calling ChatGPT: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Person Recognition Challenge | Personenrätsellösung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={loading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
          </div>

          {image && (
            <div
              ref={imageRef}
              className="relative border rounded-lg overflow-hidden"
              style={{ aspectRatio: imageSize.width / imageSize.height || 1 }}
            >
              <NextImage
                src={image}
                alt="Uploaded"
                fill
                style={{ objectFit: "contain" }}
                onDragStart={(e) => e.preventDefault()}
                priority
              />
              <div
                className="absolute inset-0"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {crop.width > 0 && crop.height > 0 && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30"
                    style={{
                      left: crop.x,
                      top: crop.y,
                      width: crop.width,
                      height: crop.height,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {image && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsCropping(!isCropping);
                  if (!isCropping) {
                    setCrop({ x: 0, y: 0, width: 0, height: 0 });
                  }
                }}
                variant={isCropping ? "secondary" : "outline"}
                disabled={loading}
              >
                <Crop className="mr-2 h-4 w-4" />
                {isCropping ? "Stop Crop" : "Crop"}
              </Button>
              <Button onClick={performOCR} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                Text Recognition
              </Button>
            </div>
          )}

          {ocrText && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">OCR Results:</h3>
              <Textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                rows={4}
                className="w-full"
              />
              <Button onClick={callChatGPT} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Solve with AI
              </Button>
            </div>
          )}

          {response && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Solution:</h3>
              <div className="p-4 bg-gray-100 rounded-lg">{response}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageProcessor;
