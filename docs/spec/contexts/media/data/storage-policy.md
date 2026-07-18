# Media Storage Policy

| Purpose | Max source bytes | Max normalized edge | Output |
| --- | ---: | ---: | --- |
| user avatar | 10 MiB | 1024 px | JPEG or PNG |
| dog avatar | 10 MiB | 1600 px | JPEG or PNG |
| walk photo | 20 MiB | 2560 px | JPEG or PNG |

animated inputはfirst frameへnormalizeします。alphaが必要な画像だけPNGを使用し、それ以外はorientation適用済みJPEGにします。EXIF、ICC以外のmetadata、source filenameを除去します。

bucketはpublic accessを無効化します。deliveryは認可後の短時間signed URLまたは同等のauthenticated CDN tokenを使います。

