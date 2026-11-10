// Usage: swift segment.swift in.png out-mask.png  (person mask, white = person)
import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("cannot read image") }
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = .accurate
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
try VNImageRequestHandler(cgImage: img).perform([req])
guard let mask = req.results?.first?.pixelBuffer else { fatalError("no person found") }
var ci = CIImage(cvPixelBuffer: mask)
let sx = CGFloat(img.width) / ci.extent.width, sy = CGFloat(img.height) / ci.extent.height
ci = ci.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
let ctx = CIContext()
guard let out = ctx.createCGImage(ci, from: CGRect(x: 0, y: 0, width: img.width, height: img.height)) else { fatalError("render failed") }
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, out, nil)
CGImageDestinationFinalize(dest)
print("mask \(img.width)x\(img.height)")
