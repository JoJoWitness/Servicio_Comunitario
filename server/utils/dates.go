package utils

import (
	"log"
	"time"
)

type DateRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

func ParseDateRange(from string, to string) (DateRange, error) {
	startDate, err := time.Parse("2006-01-02", from)
	if err != nil {
		log.Printf("Error parsing date: %v", err)
		return DateRange{}, err
	}

	var endDate time.Time
	if to != "" {
		endDate, err = time.Parse("2006-01-02", to)
		if err != nil {
			log.Printf("Error parsing date: %v", err)
			return DateRange{}, err
		}
	} else {
		endDate = startDate
	}

	r := DateRange{
		From: startDate,
		To:   endDate,
	}

	return r, nil
}
