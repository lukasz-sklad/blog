; Berengar W. Lehr (Berengar.Lehr@gmx.de)
; Medical Physics Group, Department of Diagnostic and Interventional Radiology
; Jena University Hospital, 07743 Jena, Thueringen, Germany
;
; This program is free software; you can redistribute it and/or modify
; it under the terms of the GNU General Public License as published by
; the Free Software Foundation
;
; POLSKA WERSJA / WERSJA DLA GIMP 3.x

(cond ((not (defined? 'gimp-image-get-width)) (define gimp-image-get-width gimp-image-width)))
(cond ((not (defined? 'gimp-image-get-height)) (define gimp-image-get-height gimp-image-height)))
(cond ((not (defined? 'gimp-drawable-get-offsets)) (define gimp-drawable-get-offsets gimp-drawable-offsets)))
(cond ((not (defined? 'gimp-image-get-selected-path)) (define gimp-image-get-selected-path gimp-image-get-selected-paths)))
(cond ((not (defined? 'gimp-item-id-is-layer)) (define gimp-item-id-is-layer gimp-item-is-layer)))
(cond ((not (defined? 'gimp-image-get-base-type)) (define gimp-image-get-base-type  gimp-image-base-type )))

(define pi (* 4 (atan 1.0)))

(define multi_points_reported 0)       ; ustawiane gdy wyswietlone zostanie ostrzezenie o wiecej niz 2 punktach

(define major_version_no 0)
(define minor_version_no 0)
(define release_no 0)

(define
    (script-fu-help-1Arrow
        inPointToX
        inPointToY
        inPointFromX
        inPointFromY
        theWingLength
        WingAngle
        drawable
        image
        FullHead
        MiddlePoint
    )
    (let*
        (
        (theArrowAngle (if (= (- inPointToY inPointFromY) 0)
            (/ pi (if (< (- inPointToX inPointFromX) 0) 2 -2))
            (+ (atan (/ (- inPointToX inPointFromX) (- inPointToY inPointFromY))) (if (> inPointToY inPointFromY) pi 0))
        ))
        (theLeftAngle  (+ theArrowAngle WingAngle))
        (theRightAngle (- theArrowAngle WingAngle))

        (theLeftWingEndPointX  (+ inPointToX (* theWingLength (sin theLeftAngle))))
        (theLeftWingEndPointY  (+ inPointToY (* theWingLength (cos theLeftAngle))))
        (theRightWingEndPointX (+ inPointToX (* theWingLength (sin theRightAngle))))
        (theRightWingEndPointY (+ inPointToY (* theWingLength (cos theRightAngle))))

        (points          (cons-array 4 'double))
        (theMiddleWingEndPointX 0)    (theMiddleWingEndPointY 0)
		(PreviousOpacity 100.0)
		(PreviousPaintMode 0)
        )

        (begin
		(set! PreviousOpacity (car (gimp-context-get-opacity)))
		(gimp-context-set-opacity 100.0)
		(set! PreviousPaintMode (car (gimp-context-get-paint-mode)))
        (gimp-context-set-paint-mode LAYER-MODE-NORMAL)

        (vector-set! points 0 inPointToX)               (vector-set! points 1 inPointToY)
        (vector-set! points 2 theLeftWingEndPointX)     (vector-set! points 3 theLeftWingEndPointY)
        (gimp-paintbrush-default drawable points) (set! points (cons-array 4 'double))
        (vector-set! points 0 inPointToX)               (vector-set! points 1 inPointToY)
        (vector-set! points 2 theRightWingEndPointX)    (vector-set! points 3 theRightWingEndPointY)
        (gimp-paintbrush-default drawable points)

        (if (or (equal? FullHead 1) (equal? FullHead #t)) (begin
            (set! theMiddleWingEndPointX (+ inPointToX
                                            (* (/ MiddlePoint 100) (- (/ (+ theLeftWingEndPointX theRightWingEndPointX) 2) inPointToX))
                                         ))
            (set! theMiddleWingEndPointY (+ inPointToY
                                            (* (/ MiddlePoint 100) (- (/ (+ theLeftWingEndPointY theRightWingEndPointY) 2) inPointToY))
                                         ))

            (set! points (cons-array 6 'double))
            (vector-set! points 0 theLeftWingEndPointX)      (vector-set! points 1 theLeftWingEndPointY)
            (vector-set! points 2 theMiddleWingEndPointX)    (vector-set! points 3 theMiddleWingEndPointY)
            (vector-set! points 4 theRightWingEndPointX)     (vector-set! points 5 theRightWingEndPointY)
            (gimp-paintbrush-default drawable points)

            (set! points (cons-array 8 'double))
            (vector-set! points 0 inPointToX)                (vector-set! points 1 inPointToY)
            (vector-set! points 2 theLeftWingEndPointX)      (vector-set! points 3 theLeftWingEndPointY)
            (vector-set! points 4 theMiddleWingEndPointX)    (vector-set! points 5 theMiddleWingEndPointY)
            (vector-set! points 6 theRightWingEndPointX) (vector-set! points 7 theRightWingEndPointY)
            (gimp-image-select-polygon image CHANNEL-OP-REPLACE points)
            (gimp-drawable-edit-fill drawable FILL-FOREGROUND)
            (gimp-selection-none image)
        ))
		(gimp-context-set-paint-mode PreviousPaintMode)
		(gimp-context-set-opacity PreviousOpacity)
        ) 
    ) 
) 

(define
    (Draw_Curved_Wing_Arrow
        P0x P0y P1x P1y P2x P2y P3x P3y
		t
        half_wing_width
        drawable
        image
        full_head
        middle_point
		num_points
		P0_end
		arrow_length
    )
    (let*
        (
        (points1		(cons-array 200 'double))
        (points2		(cons-array 200 'double))
        (notch_points	(cons-array 6 'double))
		(in_fill_points (cons-array 406 'double))
		(PreviousOpacity 100.0)
		(PreviousPaintMode 0)
		(count 1)
		(t_adjustment 0.0)
		(t_middle_point 0.0)
		(bezier_results '(0.0 0.0))
		(arrow_width 0.0)
		(x 0.0)
		(y 0.0)
		(x_deriv 0.0)
		(y_deriv 0.0)
		(hypot 0.0)
		(x_modifier 0.0)
		(y_modifier 0.0)
		(points_index 0)
		(x_diff 0.0)
		(y_diff 0.0)
        )

		(if (= P0_end 1)
			(begin
				(set! t_adjustment (/ t num_points))
				(set! t_middle_point (* t middle_point))
				(set! t_middle_point (/ t_middle_point 100.0))
				(set! t 0.0)
				(vector-set! points1 0 P0x)
				(vector-set! points1 1 P0y)
				(vector-set! points2 0 P0x)
				(vector-set! points2 1 P0y)
			)
			(begin
				(set! t_middle_point (- 1.0 t))
				(set! t_adjustment (/ t_middle_point num_points))
				(set! t_adjustment (- 0.0 t_adjustment))
				(set! t_middle_point (* t_middle_point middle_point))
				(set! t_middle_point (/ t_middle_point 100.0))
				(set! t_middle_point (- 1.0 t_middle_point))
				(set! t 1.0)
				(vector-set! points1 0 P3x)
				(vector-set! points1 1 P3y)
				(vector-set! points2 0 P3x)
				(vector-set! points2 1 P3y)
			)
		)

		(vector-set! notch_points 2 (car (Bezier_Coords P0x P1x P2x P3x t_middle_point)))
		(vector-set! notch_points 3 (car (Bezier_Coords P0y P1y P2y P3y t_middle_point)))

 		(set! PreviousOpacity (car (gimp-context-get-opacity)))
		(gimp-context-set-opacity 100.0)
		(set! PreviousPaintMode (car (gimp-context-get-paint-mode)))
        (gimp-context-set-paint-mode LAYER-MODE-NORMAL)

		(set! count 1)
		(set! points_index 2)
		(while (<= count num_points)
			(set! t (+ t t_adjustment))
			(set! bezier_results (Bezier_Coords P0x P1x P2x P3x t))
			(set! x (car bezier_results))
			(set! x_deriv (cadr bezier_results))
			(set! bezier_results (Bezier_Coords P0y P1y P2y P3y t))
			(set! y (car bezier_results))
			(set! y_deriv (cadr bezier_results))

			(set! x_diff (- (vector-ref points1 0) x))
			(set! y_diff (- (vector-ref points1 1) y))
			(set! hypot (sqrt (+ (* x_diff x_diff) (* y_diff y_diff))))
			(set! arrow_width (/ (* hypot half_wing_width) arrow_length))

			(set! hypot (sqrt (+ (* x_deriv x_deriv) (* y_deriv y_deriv))))

			(if (> hypot 0.0)
				(begin
					(set! x_modifier (/ (* y_deriv arrow_width) hypot))
					(set! y_modifier (/ (* x_deriv arrow_width) hypot))
					(vector-set! points1 points_index (+ x x_modifier))
					(vector-set! points2 points_index (- x x_modifier))
					(set! points_index (+ points_index 1))
					(vector-set! points1 points_index (- y y_modifier))
					(vector-set! points2 points_index (+ y y_modifier))
					(set! points_index (+ points_index 1))
				)
				(begin
					(vector-set! points1 points_index x)
					(vector-set! points2 points_index x)
					(set! points_index (+ points_index 1))
					(vector-set! points1 points_index y)
					(vector-set! points2 points_index y)
					(set! points_index (+ points_index 1))
				)
			)
 			(set! count (+ count 1))
		)

        (gimp-paintbrush-default drawable points1)
        (gimp-paintbrush-default drawable points2)

		(if (or (equal? full_head 1) (equal? full_head #t))
			(begin
				(set! points_index (- points_index 1))
				(vector-set! notch_points 1 (vector-ref points1 points_index))
				(vector-set! notch_points 5 (vector-ref points2 points_index))
				(set! points_index (- points_index 1))
				(vector-set! notch_points 0 (vector-ref points1 points_index))
				(vector-set! notch_points 4 (vector-ref points2 points_index))
				(gimp-paintbrush-default drawable notch_points)

				(set! points_index 0)
				(set! x 0)
				(set! num_points (* num_points 2))
				(while (< points_index num_points)
					(vector-set! in_fill_points x (vector-ref points1 points_index))
					(set! x (+ x 1))
					(set! points_index (+ points_index 1))
				)

				(set! y 0)
				(while (< y 6)
					(vector-set! in_fill_points x (vector-ref notch_points y))
					(set! y (+ y 1))
					(set! x (+ x 1))
				)

				(while (> points_index 0)
					(set! points_index (- points_index 1))
					(set! y (vector-ref points2 points_index))
					(set! points_index (- points_index 1))
					(vector-set! in_fill_points x (vector-ref points2 points_index))
					(set! x (+ x 1))
					(vector-set! in_fill_points x y)
					(set! x (+ x 1))
				)

				(set! num_points (* num_points 2))
				(set! num_points (+ num_points 6))
                (gimp-image-select-polygon image CHANNEL-OP-REPLACE in_fill_points)
				(gimp-drawable-edit-fill drawable FILL-FOREGROUND)
				(gimp-selection-none image)
			)
		)
		(gimp-context-set-paint-mode PreviousPaintMode)
		(gimp-context-set-opacity PreviousOpacity)
    )
)

(define (Bezier_Coords P0 P1 P2 P3 t)
	(let* (
		(result 0.0)
		(derivative 0.0)
		(term1 0.0)
		(term2 0.0)
		(term3 0.0)
		(t_cubed 0.0)
		(t_squared 0.0)
		)
	(set! t_squared (* t t))
	(set! t_cubed (* t_squared t))
	(set! term1 (- P1 P2))
	(set! term1 (* term1 3))
	(set! term1 (+ term1 P3))
	(set! term1 (- term1 P0))

	(set! term2 (* P2 3))
	(set! term2 (- term2 (* P1 6)))
	(set! term2 (+ term2 (* P0 3)))

	(set! term3 (- P1 P0))
	(set! term3 (* term3 3))

	(set! result (* t_cubed term1))
	(set! result (+ result (* t_squared term2)))
	(set! result (+ result (* t term3)))
	(set! result (+ result P0))

	(set! derivative (* t_squared (* term1 3)))
	(set! derivative (+ derivative (* t (* term2 2))))
	(set! derivative (+ derivative term3))

	(list
		result
		derivative
	)
	)
)

(define
    (script-fu-draw-arrowV3
        image
		drawable
        WingLengthFactor
        WingLengthType
        WingAngle
        FullHead
        MiddlePoint
        BrushThicknessFactor
        BrushThicknessType
        useFirstPointArrowAsHead
        usePathThenRemove
        useNewLayer
        useDoubleHeadArrow
		CurvedArrowhead
		CurvedArrowheadPoints
    )
    (let*
        (
        (theActiveVector 0)
        (paths-result (gimp-image-get-selected-path image))
        (paths-array (if (number? (car paths-result)) (cadr paths-result) (car paths-result)))
        (theNumVectors (if (number? (car paths-result)) (car paths-result) (vector-length paths-array)))
        (theFirstStroke  0)          (theStrokePoints 0)
        (theNumPoints    0)
        (inPoint_1X      0)          (inPoint_1Y      0)
        (inPoint_2X      0)          (inPoint_2Y      0)
        (x_offset        0)
        (y_offset        0)
        (i               0)

		(Bezier_x		 0.0)
		(Bezier_y		 0.0)
		(arrow_depth 0.0)
		(t 0.0)
		(new_length 0.0)
		(adjustment 0.0)
		(x_diff 0.0)
		(y_diff 0.0)
		(half_arrowhead_width 0.0)

        (theArrowLength 0)            (theWingLength 0)
        (oldLayer drawable)
        (layers_list (cons-array 1 'short))

        (brushName    "2. Hardness 100")
        (version_list (strbreakup (car (gimp-version)) "."))
        )

        (define FACTOR_IN_ABSOLUTE_PIXELS 0)
        (define FACTOR_RELATIVE_TO_PATH_LENGTH 1)

        (set! major_version_no (string->number (car version_list) 10))
        (set! minor_version_no (string->number (cadr version_list) 10))
        (set! release_no (string->number (caddr version_list) 10))
 
        (if (not (car (gimp-item-id-is-layer drawable)))
          (begin
            (gimp-message "Warstwa musi być aktywna (nie maska ani kanał), aby ten skrypt zadziałał.")
            (quit)
          )
        )

        (if (equal? theNumVectors 0)
          (begin
            (gimp-message "Musi być zaznaczona przynajmniej jedna ścieżka, aby skrypt zadziałał.")
            (quit)
          )
        )

        (set! theActiveVector (vector-ref paths-array 0))

        (if (not (= theActiveVector -1)) (begin
            (gimp-image-undo-group-start image)
            (gimp-selection-none image)
            (gimp-context-push)

            (if (or (equal? useNewLayer 1) (equal? useNewLayer #t)) (begin
                 (set! drawable (car (gimp-layer-new image "Strzalka" (car (gimp-image-get-width     image))
                                                          (car (gimp-image-get-height    image))
                                                          (+ 1 (* 2 (car (gimp-image-get-base-type image))))
                                                          100 LAYER-MODE-NORMAL )))
                (gimp-image-insert-layer image drawable 0 -1)
                (gimp-layer-add-mask drawable (car (gimp-layer-create-mask drawable ADD-MASK-BLACK)))
                (gimp-layer-remove-mask drawable MASK-APPLY)
            ))

            (set! x_offset (car (gimp-drawable-get-offsets drawable)))
            (set! y_offset (cadr (gimp-drawable-get-offsets drawable)))

			(if (> theNumVectors 1)
				(gimp-message "Zdefiniowano więcej niż jedną ścieżkę - użyto pierwszej z brzegu.")
			)

(let* ((strokes-result (gimp-path-get-strokes theActiveVector))
               (strokes-array (if (number? (car strokes-result)) (cadr strokes-result) (car strokes-result))))
          (set! theFirstStroke (vector-ref strokes-array 0))
          (let ((points-result (gimp-path-stroke-get-points theActiveVector theFirstStroke)))
            (if (number? (cadr points-result))
                (begin
                    (set! theStrokePoints (caddr points-result))
                    (set! theNumPoints (cadr points-result))
                )
                (begin
                    (set! theStrokePoints (cadr points-result))
                    (set! theNumPoints (vector-length theStrokePoints))
                )
            )
          )
        )

			(if (< theNumPoints 12)
				(begin
					(gimp-image-undo-group-end image)
					(error '(Ten skrypt wymaga ścieżki posiadającej co najmniej dwa punkty.) (/ theNumPoints 6))
				)
			)

			(if (and (> theNumPoints 12) (= 0 multi_points_reported))
                (begin
                    (gimp-message "Skrypt pobiera z całej ścieżki dwa główne punkty, by nadać kierunek grotom.")
                    (set! multi_points_reported 1)
                 )
			)

            (set! i 200)
            (while (< i (- theNumPoints 3))
                (vector-set! theStrokePoints i (- (vector-ref theStrokePoints i) x_offset))
                (set! i (+ i 1))
                (vector-set! theStrokePoints i (- (vector-ref theStrokePoints i) y_offset))
                (set! i (+ i 1))
            )

            (set! inPoint_1X    (vector-ref theStrokePoints 2))
            (set! inPoint_1Y    (vector-ref theStrokePoints 3))
            (set! inPoint_2X    (vector-ref theStrokePoints (- theNumPoints 4)))
            (set! inPoint_2Y    (vector-ref theStrokePoints (- theNumPoints 3)))

		(if (= (string->number (substring (car(gimp-version)) 0 3)) 2.10)
			(set! theArrowLength	(car (gimp-vectors-stroke-get-length theActiveVector 1 3.0)))
			(set! theArrowLength	(car (gimp-path-stroke-get-length theActiveVector 1 3.0))))
            (if (or (equal? WingLengthType FACTOR_RELATIVE_TO_PATH_LENGTH) (equal? WingLengthType "Proporcjonalnie (Długość ścieżki podzielona przez wartość)"))
            	(set! theWingLength (/ theArrowLength WingLengthFactor))
            	(set! theWingLength WingLengthFactor)
            )

	    (gimp-context-set-brush-size 11)
	    (gimp-context-set-brush-spacing 0.1)

		 (if (= (string->number (substring (car(gimp-version)) 0 3)) 2.10)
		 (gimp-context-set-brush brushName)
		 (gimp-context-set-brush (car(gimp-brush-get-by-name brushName)))	)

            (if (or (equal? BrushThicknessType FACTOR_RELATIVE_TO_PATH_LENGTH) (equal? BrushThicknessType "Proporcjonalnie (Długość ścieżki podzielona przez wartość)"))
                (gimp-context-set-brush-size (/ theArrowLength BrushThicknessFactor))
                (gimp-context-set-brush-size BrushThicknessFactor)
            )

			(set! arrow_depth (* theWingLength (cos (* (/ WingAngle 180) pi))))

			(set! half_arrowhead_width (sqrt (- (* theWingLength theWingLength) (* arrow_depth arrow_depth))))

			(set! i 0.0)
			(set! t 0.5)
			(set! adjustment 0.25)
			(while (< i 16.0)
				(set! Bezier_x (car (Bezier_Coords (vector-ref theStrokePoints 2)
										  (vector-ref theStrokePoints 4)
										  (vector-ref theStrokePoints 6)
										  (vector-ref theStrokePoints 8)
										  t)))

				(set! Bezier_y (car (Bezier_Coords (vector-ref theStrokePoints 3)
										  (vector-ref theStrokePoints 5)
										  (vector-ref theStrokePoints 7)
										  (vector-ref theStrokePoints 9)
										  t)))
				(set! x_diff (- (vector-ref theStrokePoints 2) Bezier_x))
				(set! y_diff (- (vector-ref theStrokePoints 3) Bezier_y))
				(set! new_length (sqrt (+ (* x_diff x_diff) (* y_diff y_diff))))
				(if (< new_length arrow_depth)
					(set! t (+ t adjustment))
					(set! t (- t adjustment))
				)
				(set! adjustment (/ adjustment 2))
				(set! i (+ i 1.0))
			)

			(if (or (or (equal? useFirstPointArrowAsHead 1) (equal? useFirstPointArrowAsHead #t)) (or (equal? useDoubleHeadArrow 1) (equal? useDoubleHeadArrow #t)))
				(if (or (equal? CurvedArrowhead 1) (equal? CurvedArrowhead #t))
					(begin
						(Draw_Curved_Wing_Arrow (vector-ref theStrokePoints 2)
												(vector-ref theStrokePoints 3)
												(vector-ref theStrokePoints 4)
												(vector-ref theStrokePoints 5)
												(vector-ref theStrokePoints 6)
												(vector-ref theStrokePoints 7)
												(vector-ref theStrokePoints 8)
												(vector-ref theStrokePoints 9)
												t
												half_arrowhead_width
												drawable image
												FullHead
												MiddlePoint
												CurvedArrowheadPoints
												1
												arrow_depth)
					)
					(begin
                		(script-fu-help-1Arrow inPoint_1X inPoint_1Y Bezier_x Bezier_y theWingLength (* (/ WingAngle 180) pi) drawable image FullHead MiddlePoint)
					)
				)
			)

			(set! i 0.0)
			(set! t 0.5)
			(set! adjustment 0.25)
			(while (< i 16.0)
				(set! Bezier_x (car (Bezier_Coords (vector-ref theStrokePoints (- theNumPoints 10))
										  (vector-ref theStrokePoints (- theNumPoints 8))
										  (vector-ref theStrokePoints (- theNumPoints 6))
										  (vector-ref theStrokePoints (- theNumPoints 4))
										  t)))

				(set! Bezier_y (car (Bezier_Coords (vector-ref theStrokePoints (- theNumPoints 9))
										  (vector-ref theStrokePoints (- theNumPoints 7))
										  (vector-ref theStrokePoints (- theNumPoints 5))
										  (vector-ref theStrokePoints (- theNumPoints 3))
										  t)))
				(set! x_diff (- (vector-ref theStrokePoints (- theNumPoints 4)) Bezier_x))
				(set! y_diff (- (vector-ref theStrokePoints (- theNumPoints 3)) Bezier_y))
				(set! new_length (sqrt (+ (* x_diff x_diff) (* y_diff y_diff))))
				(if (< new_length arrow_depth)
					(set! t (- t adjustment))
					(set! t (+ t adjustment))
				)
				(set! adjustment (/ adjustment 2))
				(set! i (+ i 1.0))
			)

            (if (or (or (equal? useFirstPointArrowAsHead 0) (equal? useFirstPointArrowAsHead #f)) (or (equal? useDoubleHeadArrow 1) (equal? useDoubleHeadArrow #t)))
				(if (or (equal? CurvedArrowhead 1) (equal? CurvedArrowhead #t))
					(begin
						(Draw_Curved_Wing_Arrow (vector-ref theStrokePoints (- theNumPoints 10))
												(vector-ref theStrokePoints (- theNumPoints 9))
												(vector-ref theStrokePoints (- theNumPoints 8))
												(vector-ref theStrokePoints (- theNumPoints 7))
												(vector-ref theStrokePoints (- theNumPoints 6))
												(vector-ref theStrokePoints (- theNumPoints 5))
												(vector-ref theStrokePoints (- theNumPoints 4))
												(vector-ref theStrokePoints (- theNumPoints 3))
												t
												half_arrowhead_width
												drawable image
												FullHead
												MiddlePoint
												CurvedArrowheadPoints
												0
												arrow_depth)
					)
					(begin
                		(script-fu-help-1Arrow inPoint_2X inPoint_2Y Bezier_x Bezier_y theWingLength (* (/ WingAngle 180) pi) drawable image FullHead MiddlePoint)
					)
				)
			)

            (gimp-context-set-stroke-method STROKE-PAINT-METHOD)
            (gimp-context-set-paint-method "gimp-paintbrush")
			(gimp-drawable-edit-stroke-item drawable theActiveVector)

            (gimp-context-pop)
		(if (= (string->number (substring (car(gimp-version)) 0 3)) 2.10)
            (if (or (equal? usePathThenRemove 1) (equal? usePathThenRemove #t)) (gimp-image-remove-vectors image theActiveVector))
            (if (or (equal? usePathThenRemove 1) (equal? usePathThenRemove #t)) (gimp-image-remove-path image theActiveVector)))

            (if (or (equal? useNewLayer 1) (equal? useNewLayer #t)) (begin
                (plug-in-autocrop-layer TRUE image drawable)
		 (if (= (string->number (substring (car(gimp-version)) 0 3)) 2.10)
		(gimp-image-set-active-layer image oldLayer)
		(gimp-image-set-selected-layers image (vector oldLayer))	
)
            ))
            (gimp-displays-flush)
            (gimp-image-undo-group-end image)
        )
	  )
    )
)

(script-fu-register
    "script-fu-draw-arrowV3"
    "Rysuj Strzałkę V3"
    "Rysuje strzałkę wzdłuż wybranej ścieżki" 
    "Berengar W. Lehr (spolszczenie: AI)"
    "2009-2026"
    "Aktualizacja dla GIMP 3.x"
    "*"
    SF-IMAGE       "Obraz"   0
    SF-DRAWABLE    "Warstwa"   0
    SF-ADJUSTMENT  "Długość skrzydełek grota" '(20.0 1 500 1 10 1 1)
    SF-OPTION      "Sposób obliczania długości" (list "Podana wartość (piksele)" "Proporcjonalnie (Długość ścieżki podzielona przez wartość)")
    SF-ADJUSTMENT  "Kąt między strzałką a skrzydełkiem (w stopniach)" '(25 5 85 5 15 0 1)
    SF-TOGGLE      "Wypełnić grot strzałki kolorem?" TRUE
    SF-ADJUSTMENT  "Rozmiar wcięcia wewnątrz grota (%)\n(działa tylko gdy grot jest wypełniony)" '(75 0 100 1 10 0 1)
    SF-ADJUSTMENT  "Grubość linii pędzla" '(6 1 500 1 10 0 1)
    SF-OPTION      "Sposób obliczania grubości" (list "Podana wartość (piksele)" "Proporcjonalnie (Długość ścieżki podzielona przez wartość)")
    SF-TOGGLE      "Umieścić grot na pierwszym punkcie ścieżki?\n(Zaznacz to, by zmienić kierunek strzałki)" TRUE
    SF-TOGGLE      "Usunąć ścieżkę po narysowaniu strzałki?" TRUE
    SF-TOGGLE      "Narysować strzałkę na nowej, oddzielnej warstwie?" TRUE
    SF-TOGGLE      "Narysować strzałkę dwustronną (dwa groty)?" FALSE
    SF-TOGGLE      "Wygładzić skrzydełka grota? (tylko dla krzywych ścieżek)" FALSE
    SF-ADJUSTMENT  "Liczba punktów dla wygładzonych skrzydełek (2 do 99)" '(20 2 99 1 10 0 1)
    )
(script-fu-menu-register "script-fu-draw-arrowV3" "<Image>/Tools")
