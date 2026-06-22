package com.codelabchaos.terrascape.web;

import com.hypixel.hytale.protocol.packets.worldmap.MapImage;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MapTilePngEncoderTest {

    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    };

    private static boolean isPng(byte[] bytes) {
        return bytes.length > 8 && Arrays.equals(Arrays.copyOf(bytes, 8), PNG_SIGNATURE);
    }

    @Test
    void encodeEmptyProducesPngAndCachesPerSize() {
        byte[] tile = MapTilePngEncoder.encodeEmpty(32);
        assertTrue(isPng(tile));
        // Same size returns the cached array instance.
        assertSame(tile, MapTilePngEncoder.encodeEmpty(32));
    }

    @Test
    void encodeBufferedImageProducesPng() {
        BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB);
        assertTrue(isPng(MapTilePngEncoder.encode(image)));
    }

    @Test
    void encodeMapImageProducesPng() {
        MapImage image = new MapImage(2, 2, new int[]{0x11223300, 0x44556600, 0x778899_00, 0xAABBCC00},
                (byte) 2, new byte[]{(byte) 0xE4});
        assertTrue(isPng(MapTilePngEncoder.encode(image, 8)));
    }

    @Test
    void encodeCompositeProducesPng() {
        MapImage cell = new MapImage(1, 1, new int[]{0x20304000}, (byte) 0, new byte[0]);
        byte[] png = MapTilePngEncoder.encodeComposite(new MapImage[]{cell, cell, cell, cell}, 2, 8);
        assertTrue(isPng(png));
    }

    @Test
    void drawMapImageResolvesPaletteWithZeroBitIndices() {
        // bitsPerIndex 0 → every pixel resolves to palette[0]. Palette entry is 0xRRGGBBAA.
        MapImage image = new MapImage(1, 1, new int[]{0xAABBCC00}, (byte) 0, new byte[0]);
        BufferedImage target = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);

        MapTilePngEncoder.drawMapImage(target, image, 0, 0, 1);
        assertEquals(0xAABBCC, target.getRGB(0, 0) & 0xFFFFFF);
    }

    @Test
    void drawMapImageUnpacksMultiBitIndices() {
        // 2x2 image, 2 bits/index, packed indices [0,1,2,3] = byte 0xE4 (LSB-first per index).
        int[] palette = {0x11223300, 0x44556600, 0x778899_00, 0xAABBCC00};
        MapImage image = new MapImage(2, 2, palette, (byte) 2, new byte[]{(byte) 0xE4});
        BufferedImage target = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);

        MapTilePngEncoder.drawMapImage(target, image, 0, 0, 2);

        assertEquals(0x112233, target.getRGB(0, 0) & 0xFFFFFF); // index 0
        assertEquals(0x445566, target.getRGB(1, 0) & 0xFFFFFF); // index 1
        assertEquals(0x778899, target.getRGB(0, 1) & 0xFFFFFF); // index 2
        assertEquals(0xAABBCC, target.getRGB(1, 1) & 0xFFFFFF); // index 3
    }

    @Test
    void decodeHandlesDegenerateImageSizes() {
        // Zero-sized source must not throw and yields a blank (black) tile.
        MapImage image = new MapImage(0, 0, new int[0], (byte) 0, new byte[0]);
        BufferedImage target = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        MapTilePngEncoder.drawMapImage(target, image, 0, 0, 2);
        assertEquals(0x000000, target.getRGB(0, 0) & 0xFFFFFF);
    }

    @Test
    void compositeSkipsNullAndOutOfRangeCells() {
        // Fewer images than blocks: index >= mapImages.length yields null cells, hitting the
        // "cell == null -> continue" skip. An explicit null array element does the same. The
        // produced tile is still a valid PNG.
        MapImage cell = new MapImage(1, 1, new int[]{0x20304000}, (byte) 0, new byte[0]);
        // blockSize 2 -> 4 cells expected, but supply only 2 (one of them null).
        byte[] png = MapTilePngEncoder.encodeComposite(new MapImage[]{cell, null}, 2, 8);
        assertTrue(isPng(png));
    }

    @Test
    void encodeMapImageWithNullPaletteAndIndicesYieldsBlackTile() {
        // Null palette/packedIndices exercise the defensive defaults (palette -> [], indices -> []).
        // With an empty palette every resolved index is out of range -> rgba 0 -> black pixels.
        MapImage image = new MapImage(2, 2, null, (byte) 2, null);
        BufferedImage target = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        MapTilePngEncoder.drawMapImage(target, image, 0, 0, 2);
        assertEquals(0x000000, target.getRGB(0, 0) & 0xFFFFFF);
        assertEquals(0x000000, target.getRGB(1, 1) & 0xFFFFFF);
    }

    @Test
    void unpackIndexStopsWhenPackedBytesRunOut() {
        // 2x2 image at 2 bits/index needs 1 byte (8 bits), but we supply zero packed bytes. Decode
        // must not throw: unpackIndex sees an empty buffer and returns 0 for every pixel -> the
        // palette[0] colour fills the tile.
        int[] palette = {0x123456_00, 0x000000_00, 0x000000_00, 0x000000_00};
        MapImage image = new MapImage(2, 2, palette, (byte) 2, new byte[0]);
        BufferedImage target = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        MapTilePngEncoder.drawMapImage(target, image, 0, 0, 2);
        assertEquals(0x123456, target.getRGB(0, 0) & 0xFFFFFF);
        assertEquals(0x123456, target.getRGB(1, 1) & 0xFFFFFF);
    }

    @Test
    void unpackIndexBreaksWhenByteIndexExceedsBuffer() {
        // 4x4 source at 4 bits/index needs 8 bytes; supplying only 1 forces later pixels' bit reads
        // past the buffer, exercising the "byteIndex >= length -> break" guard without throwing.
        // drawMapImage writes an outputSize x outputSize block, so the target must be 4x4.
        int[] palette = new int[16];
        palette[1] = 0x445566_00;
        MapImage image = new MapImage(4, 4, palette, (byte) 4, new byte[]{0x01});
        BufferedImage target = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        MapTilePngEncoder.drawMapImage(target, image, 0, 0, 4);
        assertEquals(0x445566, target.getRGB(0, 0) & 0xFFFFFF); // index 1 from the low nibble
        assertEquals(0x000000, target.getRGB(3, 3) & 0xFFFFFF); // bits past buffer -> index 0
    }

    @Test
    void encodeLargeTileUsesLowCompressionBranch() {
        // outputSize >= 1024 selects the 0.0f compression-quality branch in encodeFast; assert it
        // still emits a valid PNG. (1024x1024 single allocation, fast on TYPE_INT_RGB.)
        BufferedImage image = new BufferedImage(1024, 1024, BufferedImage.TYPE_INT_RGB);
        assertTrue(isPng(MapTilePngEncoder.encode(image)));
    }

    @Test
    void encodeMapImageWithLargeOutputSizeProducesPng() {
        // Drives encode(MapImage,int) through encodePixels -> encodeFast at the >=1024 size branch.
        MapImage image = new MapImage(2, 2, new int[]{0x11223300, 0x44556600, 0x77889900, 0xAABBCC00},
                (byte) 2, new byte[]{(byte) 0xE4});
        assertTrue(isPng(MapTilePngEncoder.encode(image, 1024)));
    }

    // Note: the writer-absent fallback (encodeFast lines 131-135) and the IOException->empty
    // branches (147-148, plus the PNG_WRITER null initializer at line 21) require ImageIO to lack a
    // PNG writer or to fail mid-encode. ImageIO always ships a PNG writer on the test JRE, so these
    // error paths are not reachable without bytecode/IO fault injection and are left uncovered.
}
