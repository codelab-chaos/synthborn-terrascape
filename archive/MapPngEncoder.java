package com.codelabchaos.synthworldview.web;

import com.hypixel.hytale.protocol.packets.worldmap.MapImage;

import javax.annotation.Nonnull;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

final class MapPngEncoder {
    private static final ThreadLocal<ImageWriter> PNG_WRITER = ThreadLocal.withInitial(() -> {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("png");
        return writers.hasNext() ? writers.next() : null;
    });

    private MapPngEncoder() {
    }

    static void drawMapImage(@Nonnull BufferedImage target, @Nonnull MapImage mapImage,
                             int outputX, int outputY, int outputSize) {
        int sourceWidth = mapImage.width;
        int sourceHeight = mapImage.height;
        int[] source = mapImage.data;
        int[] pixels = new int[outputSize * outputSize];
        float scaleX = (float) sourceWidth / outputSize;
        float scaleY = (float) sourceHeight / outputSize;

        for (int y = 0; y < outputSize; y++) {
            int sourceY = Math.min((int) (y * scaleY), sourceHeight - 1);
            int sourceRow = sourceY * sourceWidth;
            int outputRow = y * outputSize;
            for (int x = 0; x < outputSize; x++) {
                int sourceX = Math.min((int) (x * scaleX), sourceWidth - 1);
                int rgba = source[sourceRow + sourceX];
                int r = (rgba >> 24) & 0xFF;
                int g = (rgba >> 16) & 0xFF;
                int b = (rgba >> 8) & 0xFF;
                pixels[outputRow + x] = (r << 16) | (g << 8) | b;
            }
        }

        target.setRGB(outputX, outputY, outputSize, outputSize, pixels, 0, outputSize);
    }

    static byte[] encode(@Nonnull BufferedImage image) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(1024, image.getWidth() * image.getHeight() / 4));
        ImageWriter writer = PNG_WRITER.get();
        if (writer == null) {
            try {
                ImageIO.write(image, "png", out);
            } catch (IOException e) {
                return new byte[0];
            }
            return out.toByteArray();
        }

        try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(1.0f);
            }
            writer.write(null, new IIOImage(image, null, null), param);
            writer.reset();
        } catch (IOException e) {
            return new byte[0];
        }
        return out.toByteArray();
    }
}


     int sourceHeight = mapImage.height;
        int[] source = mapImage.data;
        int[] source = unpackPixels(mapImage);
        int[] pixels = new int[outputSize * outputSize];

    private static int[] unpackPixels(@Nonnull MapImage mapImage) {
        int pixelCount = mapImage.width * mapImage.height;
        int[] pixels = new int[pixelCount];
        int[] palette = mapImage.palette;
        byte[] packed = mapImage.packedIndices;
        int bits = Byte.toUnsignedInt(mapImage.bitsPerIndex);
        if (palette == null || palette.length == 0 || packed == null || packed.length == 0 || bits <= 0) {
            return pixels;
        }

        int mask = (1 << Math.min(bits, 30)) - 1;
        for (int i = 0; i < pixelCount; i++) {
            int bitOffset = i * bits;
            int value = 0;
            for (int bit = 0; bit < bits; bit++) {
                int absoluteBit = bitOffset + bit;
                int sourceByte = Byte.toUnsignedInt(packed[absoluteBit >> 3]);
                value |= ((sourceByte >> (absoluteBit & 7)) & 1) << bit;
            }
            int paletteIndex = value & mask;
            pixels[i] = paletteIndex >= 0 && paletteIndex < palette.length ? palette[paletteIndex] : 0;
        }
        return pixels;
    }
