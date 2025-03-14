import React, { useEffect, useRef, useState } from "react";
import { SWATCHES } from "@/constants/swatches";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "../../components/ui/button";
import axios from "axios";
import { data } from "react-router-dom";
import Draggable from "react-draggable";

declare global {
    interface Window {
      MathJax: any;
    }
  }
  window.MathJax?.typesetPromise?.();  

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

interface GeneratedResult {
    expression: string;
    answer: string;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);
    const [color, setColor] = useState('rgba(255, 255, 255, 1)');
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [dictOfVars, setDictOfVars] = useState({});
    const [latexExpression, setLatexExpression] = useState<Array<String>>([]);
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 100 });
    const nodeRef = useRef(null);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            window.MathJax.typesetPromise().then(() => {
                console.log("MathJax typeset complete");
            });
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;

                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.lineWidth = 3;
                ctx.strokeStyle = color;
            }
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js";
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            if (window.MathJax) {
                console.log("MathJax Loaded!");
                window.MathJax.typesetPromise();
            }
        };

        return () => {
            document.head.removeChild(script);
        };

    }, []);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;

        setLatexExpression([...latexExpression, latex]);

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "black";
            }
        };
    };


    const sendData = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/calculate`, {
                image: canvas.toDataURL('image/png'),
                dict_of_vars: dictOfVars,
            });
            const resp = await response.data;
            console.log(resp);
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    })
                }
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPosition({ x: centerX, y: centerY });
            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 200);
            });
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.backgroundColor = "black";
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
                setLastPosition({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
            }
        }
    }
    const finishDrawing = () => {
        setIsDrawing(false);
        setLastPosition(null);
    }
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(lastPosition.x, lastPosition.y);
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
                setLastPosition({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
            }
        }
    }
    return (
        <>
            <div className="mt-6 grid grid-cols-3 gap-2">
                <Button
                    onClick={() => setReset(true)}
                    className="z-20 bg-black text-white"
                    variant="default"
                    color="black"
                >
                    Reset
                </Button>

                <Group className='z-20 '>
                    {SWATCHES.map((swatchcolor: string) => (
                        <ColorSwatch
                            key={swatchcolor}
                            color={swatchcolor}
                            onClick={() => setColor(swatchcolor)}

                        />
                    ))}
                </Group>
                <Button
                    onClick={sendData}
                    className="z-20 bg-black text-white"
                    variant="default"
                    color="black"
                >
                    Calculate
                </Button>
            </div>
            < canvas
                ref={canvasRef}
                id="canvas"
                className='absolute top-0 left-0 w-full h-full'
                onMouseDown={startDrawing}
                onMouseOut={finishDrawing}
                onMouseUp={finishDrawing}
                onMouseMove={draw}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable nodeRef={nodeRef}
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div ref={nodeRef} className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}

        </>
    );
}
