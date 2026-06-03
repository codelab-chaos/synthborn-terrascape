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
import java.util.concurrent.ConcurrentHashMap;

final class MapTilePngEncoder {
    private static final ConcurrentHashMap<Integer, byte[]> EMPTY_TILE_CACHE = new ConcurrentHashMap<>();
    private static final ThreadLocal<ImageWriter> PNG_WRITER = ThreadLocal.withInitial(() -> {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("png");
        return writers.hasNext() ? writers.next() : null;
    });

    private MapTilePngEncoder() {
    }

    static byte[] encode(MapImage mapImage, int outputSize) {
        return encodePixels(decodePixels(mapImage, outputSize), outputSize);
    }

    static void drawMapImage(@Nonnull BufferedImage target, @Nonnull MapImage mapImage,
                             int outputX, int outputY, int outputSize) {
        int[] pixels = decodePixels(mapImage, outputSize);
        target.setRGB(outputX, outputY, outputSize, outputSize, pixels, 0, outputSize);
    }

    static byte[] encode(@Nonnull BufferedImage image) {
        return encodeFast(image, Math.max(image.getWidth(), image.getHeight()));
    }

    static byte[] encodeComposite(MapImage[] mapImages, int blockSize, int outputSize) {
        int safeBlockSize = Math.max(1, blockSize);
        int cellSize = Math.max(1, outputSize / safeBlockSize);
        int[] destData = new int[outputSize * outputSize];

        for (int blockZ = 0; blockZ < safeBlockSize; blockZ++) {
            for (int blockX = 0; blockX < safeBlockSize; blockX++) {
                int index = blockZ * safeBlockSize + blockX;
                MapImage mapImage = index >= 0 && index < mapImages.length ? mapImages[index] : null;
                int[] cell = mapImage == null ? null : decodePixels(mapImage, cellSize);
                if (cell == null) {
                    continue;
                }
                copyCell(cell, cellSize, destData, outputSize, blockX * cellSize, blockZ * cellSize);
            }
        }

        return encodePixels(destData, outputSize);
    }

    private static int[] decodePixels(MapImage mapImage, int outputSize) {
        int srcWidth = mapImage.width;
        int srcHeight = mapImage.height;
        int[] palette = mapImage.palette == null ? new int[0] : mapImage.palette;
        byte[] packedIndices = mapImage.packedIndices == null ? new byte[0] : mapImage.packedIndices;
        int[] destData = new int[outputSize * outputSize];
        if (srcWidth <= 0 || srcHeight <= 0 || outputSize <= 0) {
            return destData;
        }
        float scaleX = (float) srcWidth / outputSize;
        float scaleY = (float) srcHeight / outputSize;

        for (int y = 0; y < outputSize; y++) {
            int destRow = y * outputSize;
            int srcY = Math.min((int) (y * scaleY), srcHeight - 1);
            for (int x = 0; x < outputSize; x++) {
                int srcX = Math.min((int) (x * scaleX), srcWidth - 1);
                int index = unpackIndex(packedIndices, srcY * srcWidth + srcX, mapImage.bitsPerIndex);
                int rgba = index >= 0 && index < palette.length ? palette[index] : 0;
                int r = (rgba >> 24) & 0xFF;
                int g = (rgba >> 16) & 0xFF;
                int b = (rgba >> 8) & 0xFF;
                destData[destRow + x] = (r << 16) | (g << 8) | b;
            }
        }
        return destData;
    }

    private static void copyCell(int[] cell, int cellSize, int[] destData, int destWidth, int destX, int destY) {
        for (int y = 0; y < cellSize; y++) {
            System.arraycopy(cell, y * cellSize, destData, (destY + y) * destWidth + destX, cellSize);
        }
    }

    private static byte[] encodePixels(int[] destData, int outputSize) {
        BufferedImage buffered = new BufferedImage(outputSize, outputSize, BufferedImage.TYPE_INT_RGB);
        buffered.setRGB(0, 0, outputSize, outputSize, destData, 0, outputSize);
        return encodeFast(buffered, outputSize);
    }

    private static int unpackIndex(byte[] packedIndices, int index, int bitsPerIndex) {
        if (bitsPerIndex <= 0 || packedIndices.length == 0) {
            return 0;
        }
        int bitOffset = index * bitsPerIndex;
        int value = 0;
        for (int bit = 0; bit < bitsPerIndex; bit++) {
            int packedBit = bitOffset + bit;
            int byteIndex = packedBit >> 3;
            if (byteIndex >= packedIndices.length) {
                break;
            }
            int bitValue = (packedIndices[byteIndex] >> (packedBit & 7)) & 1;
            value |= bitValue << bit;
        }
        return value;
    }

    static byte[] encodeEmpty(int size) {
        return EMPTY_TILE_CACHE.computeIfAbsent(size, actualSize -> {
            BufferedImage buffered = new BufferedImage(actualSize, actualSize, BufferedImage.TYPE_INT_RGB);
            return encodeFast(buffered, actualSize);
        });
    }

    private static byte[] encodeFast(BufferedImage image, int outputSize) {
        ByteArrayOutputStream out = new ByteArrayOutputStream(outputSize * outputSize / 2);
        ImageWriter writer = PNG_WRITER.get();
        if (writer == null) {
            try {
                ImageIO.write(image, "png", out);
            } catch (IOException e) {
                return new byte[0];
            }
            return out.toByteArray();
        }

        try (ImageOutputStream imageOutput = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(imageOutput);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(outputSize >= 1024 ? 0.0f : 1.0f);
            }
            writer.write(null, new IIOImage(image, null, null), param);
            writer.reset();
        } catch (IOException e) {
            return new byte[0];
        }
        return out.toByteArray();
    }
}
